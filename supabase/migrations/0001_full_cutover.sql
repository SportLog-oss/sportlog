-- SportLog: full Supabase cutover migration
--
-- Run this ONCE in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / DO-block guards).
--
-- Assumes these 4 tables already exist with RLS + an auth trigger creating `profiles`
-- rows on signup (as provided by the project owner):
--   public.profiles(id, weight_kg, hr_rest, hr_max, vo2max, settings)
--   public.workouts(id, user_id, workout_type, source, duration_seconds, distance_meters,
--                    calories, avg_hr, avg_watt, summary_text, raw_telemetry)
--   public.personal_bests(id, user_id, category, value, workout_id)
--   public.goals_and_races(id, user_id, title, target_date, is_completed, type)

create extension if not exists pgcrypto; -- gen_random_uuid()

-- =============================================================================
-- 1. ALTER existing tables
-- =============================================================================

-- workouts: add fields needed for manual/OCR entries and idempotent Garmin re-sync.
alter table public.workouts
  add column if not exists started_at  timestamptz not null default now(),
  add column if not exists title       text,
  add column if not exists external_id text; -- Garmin's numeric activityId, stored as text; null for manual/OCR rows

do $$
begin
  alter table public.workouts
    add constraint workouts_user_source_external_unique
    unique (user_id, source, external_id);
exception
  when duplicate_object then null; -- constraint already present, e.g. on re-run
end $$;

-- goals_and_races: unify Goal + CompetitionResult rows, discriminated by the existing `type` column.
alter table public.goals_and_races
  -- shared / goal-only fields
  add column if not exists category      text,
  add column if not exists metric_label  text,
  add column if not exists target_value  numeric,
  add column if not exists unit          text,
  add column if not exists current_value numeric,
  add column if not exists notes         text not null default '',
  add column if not exists created_at    timestamptz not null default now(),
  -- race-only fields (CompetitionResult)
  add column if not exists location         text,
  add column if not exists distance_meters  numeric,
  add column if not exists boat_class       text,
  add column if not exists crew             text,
  add column if not exists goal_text        text,
  add column if not exists result           text,
  add column if not exists placement        integer,
  add column if not exists splits           jsonb not null default '[]',
  add column if not exists avg_heart_rate   integer,
  add column if not exists weather          text,
  add column if not exists wind             text,
  add column if not exists analysis         text;

do $$
begin
  alter table public.goals_and_races
    add constraint goals_and_races_type_check check (type in ('goal', 'race'));
exception
  when duplicate_object then null;
end $$;

-- personal_bests, profiles: no schema changes needed this pass.

-- =============================================================================
-- 2. NEW tables
-- =============================================================================

-- Opaque, whole-object cache blobs synced daily from the external AthleteData/Garmin
-- service (daily-metrics, analytics-summary, training-trends, injury-risk, anomalies,
-- performance-estimates, curves). Never queried by predicate, always read/written as one row.
create table if not exists public.app_cache (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cache_key  text not null,
  data       jsonb not null,
  fetched_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, cache_key)
);

-- One free-text note per activity (activity_id references Garmin's numeric id, not a workouts.id).
create table if not exists public.activity_notes (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id bigint not null,
  note        text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create table if not exists public.illness_log (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date              date not null,
  end_date                date,
  symptoms                text[] not null default '{}',
  medications             text[] not null default '{}',
  doctor_visits           boolean not null default false,
  training_paused_from    date,
  training_paused_until   date,
  returned_to_training_on date,
  notes                   text not null default '',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.mental_health_checkins (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "timestamp"    timestamptz not null,
  type           text not null check (type in ('emotion', 'mood')),
  valence        numeric not null check (valence between -1 and 1),
  emotion_tags   text[] not null default '{}',
  influence_tags text[] not null default '{}',
  note           text not null default '',
  created_at     timestamptz not null default now()
);

-- Pain/RPE/soreness log tied to one activity (one entry per activity per user).
create table if not exists public.training_log_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id bigint not null,
  date        date not null,
  pain        jsonb not null default '[]', -- [{bodyPart, intensity}]
  injury      boolean not null default false,
  soreness    smallint,
  rpe         smallint,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, activity_id)
);

create table if not exists public.strength_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  title       text not null default 'Krafttraining',
  activity_id bigint,
  exercises   jsonb not null default '[]', -- [{name, sets: [{weightKg, reps}]}]
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- Manual benchmark/test definitions (e.g. "2000m Ergo") + their dated history.
-- Two tables rather than one jsonb column: entries are sorted/MIN()'d for PR detection
-- and the dominant write pattern is "append one entry".
create table if not exists public.benchmarks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  kind            text not null check (kind in ('time', 'weight', 'power', 'distance')),
  unit            text not null default '',
  lower_is_better boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.benchmark_entries (
  id           uuid primary key default gen_random_uuid(),
  benchmark_id uuid not null references public.benchmarks(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date         date not null,
  value        numeric not null,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default 'Neuer Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chat_sessions(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- Singleton per user.
create table if not exists public.reminder_preferences (
  user_id        uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled_types  text[] not null default '{log-training,update-illness,log-mental-health,daily-checkin}',
  preferred_hour smallint not null default 19,
  last_sent      jsonb not null default '{}',
  updated_at     timestamptz not null default now()
);

create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 3. Row Level Security — owner-only access on every new table
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_cache', 'activity_notes', 'illness_log', 'mental_health_checkins',
    'training_log_entries', 'strength_sessions', 'benchmarks', 'benchmark_entries',
    'chat_sessions', 'chat_messages', 'reminder_preferences', 'push_tokens'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;
