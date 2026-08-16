-- SportLog 2.0: structured regatta events and individual races.
--
-- Additive migration. Existing `type = 'race'` rows in goals_and_races remain the
-- regatta event and keep all planning links intact. Individual heats/finals live
-- below that event and official results never come from Garmin automatically.

begin;

create extension if not exists pgcrypto;

create table if not exists public.competition_races (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users(id) on delete cascade,
  competition_id        uuid not null,
  race_type             text not null default 'other',
  label                 text not null default '',
  scheduled_at          timestamptz,
  distance_meters       integer not null default 2000,
  boat_class            text not null default '',
  crew                  text not null default '',
  status                text not null default 'planned',
  official_time_seconds numeric,
  placement             integer,
  field_size            integer,
  result_source         text not null default '',
  result_source_url     text not null default '',
  legacy_result_text    text not null default '',
  splits                jsonb not null default '[]'::jsonb,
  avg_heart_rate        integer,
  weather               text not null default '',
  wind                  text not null default '',
  notes                 text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint competition_races_event_owner_fk foreign key (competition_id, user_id)
    references public.goals_and_races(id, user_id) on delete cascade,
  constraint competition_races_identity_unique unique (id, user_id),
  constraint competition_races_type_check check
    (race_type in ('time_trial', 'heat', 'repechage', 'quarterfinal', 'semifinal', 'final', 'other')),
  constraint competition_races_status_check check
    (status in ('planned', 'completed', 'dns', 'dnf', 'dsq', 'cancelled')),
  constraint competition_races_distance_check check (distance_meters > 0),
  constraint competition_races_time_check check (official_time_seconds is null or official_time_seconds > 0),
  constraint competition_races_placement_check check (placement is null or placement > 0),
  constraint competition_races_field_size_check check (field_size is null or field_size > 0),
  constraint competition_races_placement_field_check check
    (placement is null or field_size is null or placement <= field_size),
  constraint competition_races_official_result_check check (
    status <> 'completed'
    or official_time_seconds is not null
    or placement is not null
    or legacy_result_text <> ''
  )
);

create index if not exists competition_races_event_schedule_idx
  on public.competition_races (competition_id, scheduled_at, created_at);
create index if not exists competition_races_user_result_idx
  on public.competition_races (user_id, boat_class, distance_meters, official_time_seconds)
  where status = 'completed' and official_time_seconds is not null;

alter table public.competition_races enable row level security;
drop policy if exists "competition_races own rows" on public.competition_races;
create policy "competition_races own rows" on public.competition_races
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Preserve already recorded single-result regattas as one explicit legacy race.
-- We deliberately retain the original text instead of guessing a time.
insert into public.competition_races (
  user_id, competition_id, race_type, label, scheduled_at, distance_meters,
  boat_class, crew, status, placement, legacy_result_text, splits,
  avg_heart_rate, weather, wind, notes, created_at, updated_at
)
select
  event.user_id,
  event.id,
  'other',
  'Bisheriges Ergebnis',
  event.target_date::timestamptz,
  greatest(coalesce(event.distance_meters, 2000)::integer, 1),
  coalesce(event.boat_class, ''),
  coalesce(event.crew, ''),
  case
    when event.is_completed and (event.placement is not null or coalesce(event.result, '') <> '') then 'completed'
    else 'planned'
  end,
  event.placement,
  coalesce(event.result, ''),
  coalesce(event.splits, '[]'::jsonb),
  event.avg_heart_rate,
  coalesce(event.weather, ''),
  coalesce(event.wind, ''),
  coalesce(event.notes, ''),
  event.created_at,
  now()
from public.goals_and_races event
where event.type = 'race'
  and (event.is_completed or coalesce(event.result, '') <> '')
  and not exists (
    select 1 from public.competition_races race
    where race.competition_id = event.id and race.user_id = event.user_id
  );

commit;
