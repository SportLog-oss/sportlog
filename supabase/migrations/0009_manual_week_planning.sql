-- SportLog 2.0: manual week planning foundation.
--
-- Local design migration. Do not execute in production without a separate approval.
-- Safe to re-run: tables and indexes are guarded; policies are replaced deterministically.

begin;

create extension if not exists pgcrypto;

create table if not exists public.planning_weeks (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start  date not null,
  focus       text not null default '',
  week_type   text not null default 'normal',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, week_start),
  constraint planning_weeks_monday_check check (extract(isodow from week_start) = 1),
  constraint planning_weeks_type_check check (week_type in ('normal', 'regeneration', 'pause', 'competition'))
);

-- Composite keys make it impossible to link planning data to another user's goal or race.
create unique index if not exists goals_and_races_id_user_unique_idx on public.goals_and_races (id, user_id);

create table if not exists public.planned_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scheduled_date        date not null,
  time_of_day           text,
  scheduled_at          timestamptz,
  sport_type            text not null,
  title                 text not null,
  planned_duration_min  integer,
  planned_intensity     text,
  description           text not null default '',
  technical_focus       text not null default '',
  trainer_note          text not null default '',
  goal_id               uuid,
  race_id               uuid,
  status                text not null default 'planned',
  change_reason         text,
  moved_from_date       date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint planned_sessions_duration_check check (planned_duration_min is null or planned_duration_min between 1 and 1440),
  constraint planned_sessions_time_of_day_check check (time_of_day is null or time_of_day in ('morning', 'midday', 'afternoon', 'evening', 'custom')),
  constraint planned_sessions_intensity_check check (planned_intensity is null or planned_intensity in ('recovery', 'easy', 'moderate', 'hard', 'competition')),
  constraint planned_sessions_status_check check (status in ('planned', 'completed', 'changed', 'cancelled', 'moved')),
  constraint planned_sessions_goal_owner_fk foreign key (goal_id, user_id)
    references public.goals_and_races(id, user_id) on delete set null (goal_id),
  constraint planned_sessions_race_owner_fk foreign key (race_id, user_id)
    references public.goals_and_races(id, user_id) on delete set null (race_id),
  unique (id, user_id)
);

-- Required for a composite ownership-preserving foreign key from match rows.
create unique index if not exists workouts_id_user_unique_idx on public.workouts (id, user_id);

create table if not exists public.planned_session_workouts (
  planned_session_id  uuid,
  workout_id          uuid not null,
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  match_status        text not null default 'suggested',
  match_score         numeric,
  match_reasons       jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  confirmed_at        timestamptz,
  primary key (planned_session_id, workout_id),
  constraint planned_session_workouts_plan_owner_fk foreign key (planned_session_id, user_id)
    references public.planned_sessions(id, user_id) on delete cascade,
  constraint planned_session_workouts_workout_owner_fk foreign key (workout_id, user_id)
    references public.workouts(id, user_id) on delete cascade,
  constraint planned_session_workouts_status_check check (match_status in ('suggested', 'confirmed', 'rejected')),
  constraint planned_session_workouts_score_check check (match_score is null or match_score between 0 and 1)
);

create table if not exists public.planned_session_events (
  id                  uuid primary key default gen_random_uuid(),
  planned_session_id  uuid not null,
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type          text not null,
  before_state        jsonb,
  after_state         jsonb,
  reason              text,
  created_at          timestamptz not null default now(),
  constraint planned_session_events_plan_owner_fk foreign key (planned_session_id, user_id)
    references public.planned_sessions(id, user_id) on delete set null (planned_session_id),
  constraint planned_session_events_type_check check (event_type in ('created', 'updated', 'moved', 'cancelled', 'deleted', 'match_added', 'match_removed'))
);

create index if not exists planned_sessions_user_date_idx on public.planned_sessions (user_id, scheduled_date);
create index if not exists planned_sessions_user_status_idx on public.planned_sessions (user_id, status);
create index if not exists planned_session_workouts_workout_idx on public.planned_session_workouts (workout_id);
create index if not exists planned_session_events_session_created_idx on public.planned_session_events (planned_session_id, created_at desc);

-- Keep planning mutations and their audit event in the same database transaction.
create or replace function public.log_planned_session_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  resolved_event_type text;
begin
  if tg_op = 'INSERT' then
    insert into public.planned_session_events (planned_session_id, user_id, event_type, after_state)
    values (new.id, new.user_id, 'created', to_jsonb(new));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.planned_session_events (planned_session_id, user_id, event_type, before_state)
    values (old.id, old.user_id, 'deleted', to_jsonb(old));
    return old;
  end if;

  resolved_event_type := case
    when new.status = 'cancelled' and old.status is distinct from new.status then 'cancelled'
    when old.scheduled_date is distinct from new.scheduled_date then 'moved'
    else 'updated'
  end;

  insert into public.planned_session_events
    (planned_session_id, user_id, event_type, before_state, after_state, reason)
  values
    (new.id, new.user_id, resolved_event_type, to_jsonb(old), to_jsonb(new), new.change_reason);
  return new;
end;
$$;

drop trigger if exists planned_sessions_event_trigger on public.planned_sessions;
create trigger planned_sessions_event_trigger
after insert or update or delete on public.planned_sessions
for each row execute function public.log_planned_session_event();

alter table public.planning_weeks enable row level security;
alter table public.planned_sessions enable row level security;
alter table public.planned_session_workouts enable row level security;
alter table public.planned_session_events enable row level security;

drop policy if exists "planning_weeks own rows" on public.planning_weeks;
create policy "planning_weeks own rows" on public.planning_weeks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "planned_sessions own rows" on public.planned_sessions;
create policy "planned_sessions own rows" on public.planned_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "planned_session_workouts own rows" on public.planned_session_workouts;
create policy "planned_session_workouts own rows" on public.planned_session_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "planned_session_events own rows" on public.planned_session_events;
create policy "planned_session_events own rows" on public.planned_session_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
