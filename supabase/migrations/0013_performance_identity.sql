-- SportLog 2.0: shared identity for rowing performance attempts.
--
-- Local implementation. Do not execute in production without a separate approval.
-- Migration 0013 creates the protected data foundation only. It does not backfill
-- user data automatically and it does not change existing application read paths.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Registry and ownership-preserving keys
-- -----------------------------------------------------------------------------

create unique index if not exists workouts_id_user_unique_idx
  on public.workouts (id, user_id);

create unique index if not exists benchmark_entries_id_user_unique_idx
  on public.benchmark_entries (id, user_id);

create unique index if not exists benchmarks_id_user_unique_idx
  on public.benchmarks (id, user_id);

create table if not exists public.performance_kind_registry (
  kind                 text primary key,
  sport                text not null,
  canonical_unit       text not null,
  lower_is_better      boolean not null,
  label                text not null,
  target_distance_m    numeric,
  target_duration_s    numeric,
  min_plausible_value  numeric not null,
  max_plausible_value  numeric not null,
  created_at           timestamptz not null default now(),
  constraint performance_kind_registry_full_unique
    unique (kind, sport, canonical_unit, lower_is_better),
  constraint performance_kind_registry_target_check check (
    (target_distance_m is not null and target_duration_s is null) or
    (target_distance_m is null and target_duration_s is not null)
  ),
  constraint performance_kind_registry_range_check check (
    min_plausible_value > 0 and max_plausible_value > min_plausible_value
  )
);

insert into public.performance_kind_registry
  (kind, sport, canonical_unit, lower_is_better, label, target_distance_m,
   target_duration_s, min_plausible_value, max_plausible_value)
values
  ('rowing_350m',  'rowing', 's', true,  '350 m',             350,  null, 40,   180),
  ('rowing_500m',  'rowing', 's', true,  '500 m',             500,  null, 70,   260),
  ('rowing_1000m', 'rowing', 's', true,  '1000 m',            1000, null, 150,  560),
  ('rowing_1500m', 'rowing', 's', true,  '1500 m',            1500, null, 230,  850),
  ('rowing_2000m', 'rowing', 's', true,  '2000 m',            2000, null, 330,  1150),
  ('rowing_5000m', 'rowing', 's', true,  '5000 m',            5000, null, 900,  3000),
  ('rowing_6000m', 'rowing', 's', true,  '6000 m',            6000, null, 1100, 3600),
  ('rowing_30min', 'rowing', 'm', false, 'Beste 30 Minuten',  null, 1800, 3000, 9500)
on conflict (kind) do update set
  sport = excluded.sport,
  canonical_unit = excluded.canonical_unit,
  lower_is_better = excluded.lower_is_better,
  label = excluded.label,
  target_distance_m = excluded.target_distance_m,
  target_duration_s = excluded.target_duration_s,
  min_plausible_value = excluded.min_plausible_value,
  max_plausible_value = excluded.max_plausible_value;

-- Structured identity for future benchmark writes. Existing rows stay unbound
-- until the explicit preview/apply backfill recognises an unambiguous standard test.
alter table public.benchmarks
  add column if not exists performance_kind text
    references public.performance_kind_registry(kind) on delete restrict;

-- -----------------------------------------------------------------------------
-- Attempts, sources, current link state and immutable events
-- -----------------------------------------------------------------------------

create table if not exists public.performance_attempts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind                   text not null,
  sport                  text not null,
  value                  numeric not null check (value > 0),
  unit                   text not null,
  lower_is_better        boolean not null,
  occurred_at            timestamptz not null,
  status                 text not null default 'active'
                           check (status in ('active', 'merged_away', 'orphaned')),
  merged_into_attempt_id uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint performance_attempts_registry_fk
    foreign key (kind, sport, unit, lower_is_better)
    references public.performance_kind_registry
      (kind, sport, canonical_unit, lower_is_better),
  constraint performance_attempts_merge_consistency check (
    (status in ('active', 'orphaned') and merged_into_attempt_id is null) or
    (status = 'merged_away' and merged_into_attempt_id is not null)
  ),
  constraint performance_attempts_not_merged_into_self check (
    merged_into_attempt_id is null or merged_into_attempt_id <> id
  ),
  unique (id, user_id),
  constraint performance_attempts_merge_owner_fk
    foreign key (merged_into_attempt_id, user_id)
    references public.performance_attempts(id, user_id) on delete restrict
);

create index if not exists performance_attempts_user_kind_status_idx
  on public.performance_attempts (user_id, kind, status);

create table if not exists public.performance_sources (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attempt_id         uuid not null,
  kind               text not null,
  source_type        text not null check (
                       source_type in ('workout_garmin', 'workout_concept2', 'benchmark_entry')
                     ),
  workout_id         uuid,
  benchmark_entry_id uuid,
  observed_value     numeric not null check (observed_value > 0),
  observed_unit      text not null,
  observed_at        timestamptz not null,
  source_quality     text not null check (
                       source_quality in ('device_exact', 'activity_derived')
                     ),
  created_at         timestamptz not null default now(),
  constraint performance_sources_pairing_check check (
    (source_type in ('workout_garmin', 'workout_concept2')
      and workout_id is not null and benchmark_entry_id is null) or
    (source_type = 'benchmark_entry'
      and benchmark_entry_id is not null and workout_id is null)
  ),
  constraint performance_sources_quality_check check (
    (source_type = 'workout_garmin' and source_quality = 'activity_derived') or
    (source_type in ('workout_concept2', 'benchmark_entry') and source_quality = 'device_exact')
  ),
  constraint performance_sources_attempt_owner_fk
    foreign key (attempt_id, user_id)
    references public.performance_attempts(id, user_id) on delete restrict,
  constraint performance_sources_workout_owner_fk
    foreign key (workout_id, user_id)
    references public.workouts(id, user_id) on delete cascade,
  constraint performance_sources_benchmark_owner_fk
    foreign key (benchmark_entry_id, user_id)
    references public.benchmark_entries(id, user_id) on delete cascade,
  unique (workout_id, kind),
  unique (benchmark_entry_id)
);

create index if not exists performance_sources_attempt_idx
  on public.performance_sources (attempt_id);

create table if not exists public.performance_attempt_link_state (
  attempt_a_id uuid not null,
  attempt_b_id uuid not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null check (status in ('suggested', 'confirmed', 'rejected')),
  updated_at   timestamptz not null default now(),
  primary key (attempt_a_id, attempt_b_id),
  constraint performance_attempt_link_state_order_check check (attempt_a_id < attempt_b_id),
  constraint performance_attempt_link_state_a_owner_fk
    foreign key (attempt_a_id, user_id)
    references public.performance_attempts(id, user_id) on delete restrict,
  constraint performance_attempt_link_state_b_owner_fk
    foreign key (attempt_b_id, user_id)
    references public.performance_attempts(id, user_id) on delete restrict
);

create table if not exists public.performance_attempt_link_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  attempt_a_id uuid not null,
  attempt_b_id uuid not null,
  event_type   text not null check (event_type in ('suggested', 'confirmed', 'rejected', 'reversed')),
  note         text,
  created_at   timestamptz not null default now(),
  constraint performance_attempt_link_events_order_check check (attempt_a_id < attempt_b_id),
  constraint performance_attempt_link_events_a_owner_fk
    foreign key (attempt_a_id, user_id)
    references public.performance_attempts(id, user_id) on delete restrict,
  constraint performance_attempt_link_events_b_owner_fk
    foreign key (attempt_b_id, user_id)
    references public.performance_attempts(id, user_id) on delete restrict
);

create index if not exists performance_attempt_link_events_pair_idx
  on public.performance_attempt_link_events (attempt_a_id, attempt_b_id, created_at desc);

create or replace view public.performance_bests
with (security_invoker = true) as
select distinct on (pa.user_id, pa.kind)
  pa.id as attempt_id,
  pa.user_id,
  pa.kind,
  pa.value,
  pa.unit,
  pa.lower_is_better,
  pa.occurred_at
from public.performance_attempts pa
where pa.status = 'active'
order by
  pa.user_id,
  pa.kind,
  case when pa.lower_is_better then pa.value else -pa.value end,
  pa.occurred_at;

-- -----------------------------------------------------------------------------
-- Internal helpers
-- -----------------------------------------------------------------------------

create or replace function public.resolve_active_root_attempt(p_attempt_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_next uuid; v_current uuid := p_attempt_id; v_seen uuid[] := array[]::uuid[];
begin
  loop
    if v_current = any(v_seen) then raise exception 'Performance attempt merge cycle detected'; end if;
    v_seen := array_append(v_seen, v_current);
    select status, merged_into_attempt_id into v_status, v_next
    from public.performance_attempts where id = v_current;
    if not found then return null; end if;
    if v_status <> 'merged_away' then return v_current; end if;
    v_current := v_next;
  end loop;
end;
$$;

create or replace function public.recompute_attempt_canonical_value(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_root uuid; v_best record;
begin
  v_root := public.resolve_active_root_attempt(p_attempt_id);
  if v_root is null then return; end if;

  with recursive attempt_family(id) as (
    select v_root
    union all
    select pa.id
    from public.performance_attempts pa
    join attempt_family parent on pa.merged_into_attempt_id = parent.id
    where pa.status = 'merged_away'
  )
  select ps.observed_value, ps.observed_unit, ps.observed_at into v_best
  from public.performance_sources ps
  join attempt_family family on family.id = ps.attempt_id
  order by
    case ps.source_quality when 'device_exact' then 2 else 1 end desc,
    ps.observed_at asc,
    ps.id asc
  limit 1;

  if not found then
    update public.performance_attempts
    set status = 'orphaned', updated_at = now()
    where id = v_root and status = 'active';
    return;
  end if;

  update public.performance_attempts
  set value = v_best.observed_value,
      unit = v_best.observed_unit,
      occurred_at = v_best.observed_at,
      status = case when status = 'orphaned' then 'active' else status end,
      updated_at = now()
  where id = v_root;
end;
$$;

create or replace function public.performance_source_observation(
  p_kind text,
  p_source_type text,
  p_workout_id uuid default null,
  p_benchmark_entry_id uuid default null
) returns table (
  observed_value numeric,
  observed_unit text,
  observed_at timestamptz,
  source_quality text
) language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reg record; v_workout record; v_entry record; v_tolerance numeric;
begin
  select * into v_reg from public.performance_kind_registry where kind = p_kind;
  if not found then raise exception 'Unknown performance kind: %', p_kind; end if;

  if p_source_type in ('workout_garmin', 'workout_concept2') then
    select * into v_workout from public.workouts where id = p_workout_id;
    if not found then raise exception 'Workout not found'; end if;
    if v_workout.workout_type is null
       or v_workout.workout_type not in ('ROWING_V2', 'INDOOR_ROWING') then
      raise exception 'Workout is not rowing';
    end if;
    if p_source_type = 'workout_garmin'
       and v_workout.source is distinct from 'garmin' then
      raise exception 'Workout is not a Garmin workout';
    end if;
    if p_source_type = 'workout_concept2'
       and v_workout.source is distinct from 'concept2_ocr' then
      raise exception 'Workout is not a confirmed Concept2 workout';
    end if;
    if v_workout.duration_seconds is null or v_workout.duration_seconds <= 0
       or v_workout.distance_meters is null or v_workout.distance_meters <= 0 then
      raise exception 'Workout has no valid duration and distance';
    end if;

    if v_reg.target_distance_m is not null then
      v_tolerance := case when p_source_type = 'workout_garmin' then 0.03 else 0.001 end;
      if abs(v_workout.distance_meters - v_reg.target_distance_m) / v_reg.target_distance_m > v_tolerance then
        raise exception 'Workout distance does not match performance kind %', p_kind;
      end if;
      observed_value := v_workout.duration_seconds;
    else
      v_tolerance := case when p_source_type = 'workout_garmin' then 60 else 1 end;
      if abs(v_workout.duration_seconds - v_reg.target_duration_s) > v_tolerance then
        raise exception 'Workout duration does not match performance kind %', p_kind;
      end if;
      observed_value := v_workout.distance_meters;
    end if;

    observed_unit := v_reg.canonical_unit;
    observed_at := v_workout.started_at;
    source_quality := case
      when p_source_type = 'workout_concept2' then 'device_exact'
      else 'activity_derived'
    end;
    return next;
    return;
  end if;

  if p_source_type = 'benchmark_entry' then
    select be.value, be.date, b.kind as benchmark_kind, b.unit, b.performance_kind
    into v_entry
    from public.benchmark_entries be
    join public.benchmarks b on b.id = be.benchmark_id
    where be.id = p_benchmark_entry_id;
    if not found then raise exception 'Benchmark entry not found'; end if;
    if v_entry.benchmark_kind is distinct from 'time'
       or v_entry.unit is distinct from v_reg.canonical_unit then
      raise exception 'Benchmark type or unit does not match performance kind %', p_kind;
    end if;
    if v_entry.performance_kind is distinct from p_kind then
      raise exception 'Benchmark is not bound to performance kind %', p_kind;
    end if;
    observed_value := v_entry.value;
    observed_unit := v_reg.canonical_unit;
    observed_at := v_entry.date::timestamptz;
    source_quality := 'device_exact';
    return next;
    return;
  end if;

  raise exception 'Unsupported performance source type: %', p_source_type;
end;
$$;

-- -----------------------------------------------------------------------------
-- Structural validation and synchronisation triggers
-- -----------------------------------------------------------------------------

create or replace function public.validate_performance_source()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_attempt record; v_reg record; v_expected record;
begin
  select * into v_attempt from public.performance_attempts
  where id = new.attempt_id and user_id = new.user_id;
  if not found then raise exception 'Performance attempt does not exist or has another owner'; end if;
  if new.kind <> v_attempt.kind or new.observed_unit <> v_attempt.unit then
    raise exception 'Performance source kind or unit does not match its attempt';
  end if;

  select * into v_reg from public.performance_kind_registry where kind = new.kind;
  if new.observed_value < v_reg.min_plausible_value
     or new.observed_value > v_reg.max_plausible_value then
    raise exception 'Performance source value is outside the plausible range for %', new.kind;
  end if;

  select * into v_expected from public.performance_source_observation(
    new.kind, new.source_type, new.workout_id, new.benchmark_entry_id
  );
  if new.observed_value is distinct from v_expected.observed_value
     or new.observed_unit is distinct from v_expected.observed_unit
     or new.observed_at is distinct from v_expected.observed_at
     or new.source_quality is distinct from v_expected.source_quality then
    raise exception 'Performance source does not match its raw source';
  end if;
  return new;
end;
$$;

create or replace function public.sync_performance_source_from_benchmark_entry()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_source record; v_obs record;
begin
  for v_source in
    select * from public.performance_sources where benchmark_entry_id = new.id
  loop
    select * into v_obs from public.performance_source_observation(
      v_source.kind, 'benchmark_entry', null, new.id
    );
    update public.performance_sources
    set observed_value = v_obs.observed_value,
        observed_unit = v_obs.observed_unit,
        observed_at = v_obs.observed_at,
        source_quality = v_obs.source_quality
    where id = v_source.id;
    perform public.recompute_attempt_canonical_value(v_source.attempt_id);
  end loop;
  return new;
end;
$$;

create or replace function public.sync_performance_source_from_workout()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_source record; v_obs record;
begin
  for v_source in
    select * from public.performance_sources where workout_id = new.id
  loop
    select * into v_obs from public.performance_source_observation(
      v_source.kind, v_source.source_type, new.id, null
    );
    update public.performance_sources
    set observed_value = v_obs.observed_value,
        observed_unit = v_obs.observed_unit,
        observed_at = v_obs.observed_at,
        source_quality = v_obs.source_quality
    where id = v_source.id;
    perform public.recompute_attempt_canonical_value(v_source.attempt_id);
  end loop;
  return new;
end;
$$;

create or replace function public.recompute_after_performance_source_delete()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.recompute_attempt_canonical_value(old.attempt_id);
  return old;
end;
$$;

create or replace function public.deny_performance_link_event_mutation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  raise exception 'Performance link events are append-only';
end;
$$;

drop trigger if exists performance_sources_validate on public.performance_sources;
create trigger performance_sources_validate
before insert or update on public.performance_sources
for each row execute function public.validate_performance_source();

drop trigger if exists benchmark_entries_sync_performance_source on public.benchmark_entries;
create trigger benchmark_entries_sync_performance_source
after update of value, date on public.benchmark_entries
for each row execute function public.sync_performance_source_from_benchmark_entry();

drop trigger if exists workouts_sync_performance_source on public.workouts;
create trigger workouts_sync_performance_source
after update of duration_seconds, distance_meters, started_at, workout_type, source on public.workouts
for each row execute function public.sync_performance_source_from_workout();

drop trigger if exists performance_sources_after_delete on public.performance_sources;
create trigger performance_sources_after_delete
after delete on public.performance_sources
for each row execute function public.recompute_after_performance_source_delete();

drop trigger if exists performance_attempt_link_events_immutable on public.performance_attempt_link_events;
create trigger performance_attempt_link_events_immutable
before update or delete on public.performance_attempt_link_events
for each row execute function public.deny_performance_link_event_mutation();

-- -----------------------------------------------------------------------------
-- Controlled attempt/source registration
-- -----------------------------------------------------------------------------

create or replace function public.register_performance_workout_attempt(
  p_workout_id uuid,
  p_kind text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_source_type text; v_reg record; v_obs record;
declare v_existing uuid; v_attempt uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select case source
    when 'garmin' then 'workout_garmin'
    when 'concept2_ocr' then 'workout_concept2'
    else null
  end into v_source_type
  from public.workouts where id = p_workout_id and user_id = v_user;
  if v_source_type is null then raise exception 'Workout is missing, foreign or unsupported'; end if;

  select attempt_id into v_existing from public.performance_sources
  where workout_id = p_workout_id and kind = p_kind and user_id = v_user;
  if found then return v_existing; end if;

  select * into v_reg from public.performance_kind_registry where kind = p_kind;
  if not found then raise exception 'Unknown performance kind'; end if;
  select * into v_obs from public.performance_source_observation(
    p_kind, v_source_type, p_workout_id, null
  );

  begin
    insert into public.performance_attempts
      (user_id, kind, sport, value, unit, lower_is_better, occurred_at)
    values
      (v_user, p_kind, v_reg.sport, v_obs.observed_value,
       v_obs.observed_unit, v_reg.lower_is_better, v_obs.observed_at)
    returning id into v_attempt;

    insert into public.performance_sources
      (user_id, attempt_id, kind, source_type, workout_id,
       observed_value, observed_unit, observed_at, source_quality)
    values
      (v_user, v_attempt, p_kind, v_source_type, p_workout_id,
       v_obs.observed_value, v_obs.observed_unit, v_obs.observed_at, v_obs.source_quality);
  exception when unique_violation then
    select attempt_id into v_existing from public.performance_sources
    where workout_id = p_workout_id and kind = p_kind and user_id = v_user;
    if v_existing is null then raise; end if;
    return v_existing;
  end;

  return v_attempt;
end;
$$;

create or replace function public.register_performance_benchmark_attempt(
  p_benchmark_entry_id uuid,
  p_kind text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_reg record; v_obs record;
declare v_existing uuid; v_attempt uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if not exists (
    select 1 from public.benchmark_entries be
    join public.benchmarks b on b.id = be.benchmark_id
    where be.id = p_benchmark_entry_id and be.user_id = v_user
      and b.user_id = v_user and b.performance_kind = p_kind
  ) then
    raise exception 'Benchmark entry is missing, foreign or bound to another performance kind';
  end if;

  select attempt_id into v_existing from public.performance_sources
  where benchmark_entry_id = p_benchmark_entry_id and user_id = v_user;
  if found then return v_existing; end if;

  select * into v_reg from public.performance_kind_registry where kind = p_kind;
  if not found then raise exception 'Unknown performance kind'; end if;
  select * into v_obs from public.performance_source_observation(
    p_kind, 'benchmark_entry', null, p_benchmark_entry_id
  );

  begin
    insert into public.performance_attempts
      (user_id, kind, sport, value, unit, lower_is_better, occurred_at)
    values
      (v_user, p_kind, v_reg.sport, v_obs.observed_value,
       v_obs.observed_unit, v_reg.lower_is_better, v_obs.observed_at)
    returning id into v_attempt;

    insert into public.performance_sources
      (user_id, attempt_id, kind, source_type, benchmark_entry_id,
       observed_value, observed_unit, observed_at, source_quality)
    values
      (v_user, v_attempt, p_kind, 'benchmark_entry', p_benchmark_entry_id,
       v_obs.observed_value, v_obs.observed_unit, v_obs.observed_at, v_obs.source_quality);
  exception when unique_violation then
    select attempt_id into v_existing from public.performance_sources
    where benchmark_entry_id = p_benchmark_entry_id and user_id = v_user;
    if v_existing is null then raise; end if;
    return v_existing;
  end;

  return v_attempt;
end;
$$;

create or replace function public.attach_performance_source_to_attempt(
  p_attempt_id uuid,
  p_source_type text,
  p_workout_id uuid default null,
  p_benchmark_entry_id uuid default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_root uuid; v_attempt record; v_obs record; v_existing uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  v_root := public.resolve_active_root_attempt(p_attempt_id);
  select * into v_attempt from public.performance_attempts
  where id = v_root and user_id = v_user and status = 'active';
  if not found then raise exception 'Active performance attempt not found'; end if;

  if p_source_type in ('workout_garmin', 'workout_concept2') then
    if not exists (select 1 from public.workouts where id = p_workout_id and user_id = v_user) then
      raise exception 'Workout is missing or foreign';
    end if;
    select attempt_id into v_existing from public.performance_sources
    where workout_id = p_workout_id and kind = v_attempt.kind and user_id = v_user;
  elsif p_source_type = 'benchmark_entry' then
    if not exists (
      select 1 from public.benchmark_entries be
      join public.benchmarks b on b.id = be.benchmark_id
      where be.id = p_benchmark_entry_id and be.user_id = v_user
        and b.user_id = v_user and b.performance_kind = v_attempt.kind
    ) then raise exception 'Benchmark entry is missing, foreign or bound differently'; end if;
    select attempt_id into v_existing from public.performance_sources
    where benchmark_entry_id = p_benchmark_entry_id and user_id = v_user;
  else
    raise exception 'Unsupported performance source type';
  end if;

  if v_existing is not null then
    if public.resolve_active_root_attempt(v_existing) = v_root then return v_root; end if;
    raise exception 'Source already belongs to another performance attempt';
  end if;

  select * into v_obs from public.performance_source_observation(
    v_attempt.kind, p_source_type, p_workout_id, p_benchmark_entry_id
  );
  insert into public.performance_sources
    (user_id, attempt_id, kind, source_type, workout_id, benchmark_entry_id,
     observed_value, observed_unit, observed_at, source_quality)
  values
    (v_user, v_root, v_attempt.kind, p_source_type, p_workout_id, p_benchmark_entry_id,
     v_obs.observed_value, v_obs.observed_unit, v_obs.observed_at, v_obs.source_quality);
  perform public.recompute_attempt_canonical_value(v_root);
  return v_root;
end;
$$;

-- -----------------------------------------------------------------------------
-- Human-controlled merge state transitions
-- -----------------------------------------------------------------------------

create or replace function public.suggest_performance_attempt_link(
  p_attempt_x uuid, p_attempt_y uuid, p_note text default null
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_a uuid; v_b uuid; v_rows int; v_kinds int; v_state text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_attempt_x = p_attempt_y then raise exception 'Cannot link an attempt to itself'; end if;
  v_a := least(p_attempt_x, p_attempt_y); v_b := greatest(p_attempt_x, p_attempt_y);
  select count(*), count(distinct kind) into v_rows, v_kinds
  from public.performance_attempts
  where id in (v_a, v_b) and user_id = v_user and status = 'active';
  if v_rows <> 2 or v_kinds <> 1 then
    raise exception 'Attempts are missing, foreign, inactive or incompatible';
  end if;

  insert into public.performance_attempt_link_state
    (attempt_a_id, attempt_b_id, user_id, status)
  values (v_a, v_b, v_user, 'suggested')
  on conflict (attempt_a_id, attempt_b_id) do update
    set status = case
      when performance_attempt_link_state.status = 'rejected' then 'suggested'
      else performance_attempt_link_state.status
    end,
    updated_at = now()
  returning status into v_state;

  if v_state = 'suggested' and not exists (
    select 1 from public.performance_attempt_link_events
    where attempt_a_id = v_a and attempt_b_id = v_b
      and event_type = 'suggested'
      and created_at = (
        select max(created_at) from public.performance_attempt_link_events
        where attempt_a_id = v_a and attempt_b_id = v_b
      )
  ) then
    insert into public.performance_attempt_link_events
      (user_id, attempt_a_id, attempt_b_id, event_type, note)
    values (v_user, v_a, v_b, 'suggested', p_note);
  end if;
  return v_state;
end;
$$;

create or replace function public.confirm_performance_attempt_link(
  p_attempt_x uuid, p_attempt_y uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_a uuid; v_b uuid; v_state record;
declare v_att_a record; v_att_b record; v_survivor uuid; v_loser uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  v_a := least(p_attempt_x, p_attempt_y); v_b := greatest(p_attempt_x, p_attempt_y);
  select * into v_state from public.performance_attempt_link_state
  where attempt_a_id = v_a and attempt_b_id = v_b and user_id = v_user for update;
  if not found or v_state.status <> 'suggested' then raise exception 'No open suggestion'; end if;
  select * into v_att_a from public.performance_attempts where id = v_a and user_id = v_user for update;
  select * into v_att_b from public.performance_attempts where id = v_b and user_id = v_user for update;
  if v_att_a.status <> 'active' or v_att_b.status <> 'active' or v_att_a.kind <> v_att_b.kind then
    raise exception 'Attempts are inactive or incompatible';
  end if;
  if v_att_a.occurred_at < v_att_b.occurred_at
     or (v_att_a.occurred_at = v_att_b.occurred_at and v_a < v_b) then
    v_survivor := v_a; v_loser := v_b;
  else
    v_survivor := v_b; v_loser := v_a;
  end if;
  update public.performance_attempts
  set status = 'merged_away', merged_into_attempt_id = v_survivor, updated_at = now()
  where id = v_loser;
  update public.performance_attempt_link_state set status = 'confirmed', updated_at = now()
  where attempt_a_id = v_a and attempt_b_id = v_b;
  insert into public.performance_attempt_link_events
    (user_id, attempt_a_id, attempt_b_id, event_type)
  values (v_user, v_a, v_b, 'confirmed');
  perform public.recompute_attempt_canonical_value(v_survivor);
end;
$$;

create or replace function public.reject_performance_attempt_link(
  p_attempt_x uuid, p_attempt_y uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_a uuid; v_b uuid; v_state record;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  v_a := least(p_attempt_x, p_attempt_y); v_b := greatest(p_attempt_x, p_attempt_y);
  select * into v_state from public.performance_attempt_link_state
  where attempt_a_id = v_a and attempt_b_id = v_b and user_id = v_user for update;
  if not found or v_state.status <> 'suggested' then raise exception 'No open suggestion'; end if;
  update public.performance_attempt_link_state set status = 'rejected', updated_at = now()
  where attempt_a_id = v_a and attempt_b_id = v_b;
  insert into public.performance_attempt_link_events
    (user_id, attempt_a_id, attempt_b_id, event_type)
  values (v_user, v_a, v_b, 'rejected');
end;
$$;

create or replace function public.reverse_performance_attempt_merge(
  p_attempt_x uuid, p_attempt_y uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_a uuid; v_b uuid; v_state record;
declare v_att_a record; v_att_b record; v_loser uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  v_a := least(p_attempt_x, p_attempt_y); v_b := greatest(p_attempt_x, p_attempt_y);
  select * into v_state from public.performance_attempt_link_state
  where attempt_a_id = v_a and attempt_b_id = v_b and user_id = v_user for update;
  if not found or v_state.status <> 'confirmed' then raise exception 'No confirmed merge'; end if;
  select * into v_att_a from public.performance_attempts where id = v_a and user_id = v_user for update;
  select * into v_att_b from public.performance_attempts where id = v_b and user_id = v_user for update;
  if v_att_a.status = 'merged_away' and v_att_a.merged_into_attempt_id = v_b then v_loser := v_a;
  elsif v_att_b.status = 'merged_away' and v_att_b.merged_into_attempt_id = v_a then v_loser := v_b;
  else raise exception 'Merge state is inconsistent'; end if;
  update public.performance_attempts
  set status = 'active', merged_into_attempt_id = null, updated_at = now()
  where id = v_loser;
  delete from public.performance_attempt_link_state
  where attempt_a_id = v_a and attempt_b_id = v_b;
  insert into public.performance_attempt_link_events
    (user_id, attempt_a_id, attempt_b_id, event_type)
  values (v_user, v_a, v_b, 'reversed');
  perform public.recompute_attempt_canonical_value(v_a);
  perform public.recompute_attempt_canonical_value(v_b);
end;
$$;

-- -----------------------------------------------------------------------------
-- Previewable, explicit current-user backfill
-- -----------------------------------------------------------------------------

create or replace function public.backfill_performance_attempts_for_current_user(
  p_apply boolean default false
) returns table (
  would_create integer,
  already_present integer,
  skipped integer,
  ambiguous integer
) language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_workout record; v_benchmark record; v_reg record;
declare v_create int := 0; v_present int := 0; v_skipped int := 0; v_ambiguous int := 0;
declare v_matches int; v_kind text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  for v_workout in
    select * from public.workouts
    where user_id = v_user
      and source in ('garmin', 'concept2_ocr')
      and workout_type in ('ROWING_V2', 'INDOOR_ROWING')
      and duration_seconds > 0 and distance_meters > 0
  loop
    for v_reg in select * from public.performance_kind_registry loop
      if (v_reg.target_distance_m is not null and
          abs(v_workout.distance_meters - v_reg.target_distance_m) / v_reg.target_distance_m <=
            case when v_workout.source = 'garmin' then 0.03 else 0.001 end)
         or (v_reg.target_duration_s is not null and
          abs(v_workout.duration_seconds - v_reg.target_duration_s) <=
            case when v_workout.source = 'garmin' then 60 else 1 end) then
        if exists (
          select 1 from public.performance_sources
          where workout_id = v_workout.id and kind = v_reg.kind and user_id = v_user
        ) then
          v_present := v_present + 1;
        else
          v_create := v_create + 1;
          if p_apply then perform public.register_performance_workout_attempt(v_workout.id, v_reg.kind); end if;
        end if;
      end if;
    end loop;
  end loop;

  for v_benchmark in
    select b.id, b.name, b.performance_kind
    from public.benchmarks b where b.user_id = v_user and b.kind = 'time' and b.unit = 's'
  loop
    v_kind := v_benchmark.performance_kind;
    if v_kind is null then
      select count(*), min(kind) into v_matches, v_kind
      from public.performance_kind_registry
      where target_distance_m = substring(v_benchmark.name from '^([0-9]+)m')::numeric;
      if v_matches = 0 then v_skipped := v_skipped + 1; continue; end if;
      if v_matches > 1 then v_ambiguous := v_ambiguous + 1; continue; end if;
      if p_apply then
        update public.benchmarks set performance_kind = v_kind
        where id = v_benchmark.id and user_id = v_user and performance_kind is null;
      end if;
    end if;

    for v_reg in
      select be.id from public.benchmark_entries be
      where be.benchmark_id = v_benchmark.id and be.user_id = v_user
    loop
      if exists (
        select 1 from public.performance_sources
        where benchmark_entry_id = v_reg.id and user_id = v_user
      ) then
        v_present := v_present + 1;
      else
        v_create := v_create + 1;
        if p_apply then perform public.register_performance_benchmark_attempt(v_reg.id, v_kind); end if;
      end if;
    end loop;
  end loop;

  return query select v_create, v_present, v_skipped, v_ambiguous;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS and privileges
-- -----------------------------------------------------------------------------

alter table public.performance_kind_registry enable row level security;
alter table public.performance_attempts enable row level security;
alter table public.performance_sources enable row level security;
alter table public.performance_attempt_link_state enable row level security;
alter table public.performance_attempt_link_events enable row level security;

drop policy if exists "performance registry readable" on public.performance_kind_registry;
create policy "performance registry readable" on public.performance_kind_registry
for select to authenticated using (true);

drop policy if exists "performance attempts own rows readable" on public.performance_attempts;
create policy "performance attempts own rows readable" on public.performance_attempts
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "performance sources own rows readable" on public.performance_sources;
create policy "performance sources own rows readable" on public.performance_sources
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "performance link state own rows readable" on public.performance_attempt_link_state;
create policy "performance link state own rows readable" on public.performance_attempt_link_state
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "performance link events own rows readable" on public.performance_attempt_link_events;
create policy "performance link events own rows readable" on public.performance_attempt_link_events
for select to authenticated using (auth.uid() = user_id);

revoke all on public.performance_kind_registry,
              public.performance_attempts,
              public.performance_sources,
              public.performance_attempt_link_state,
              public.performance_attempt_link_events
from anon;

revoke insert, update, delete on public.performance_kind_registry,
                                  public.performance_attempts,
                                  public.performance_sources,
                                  public.performance_attempt_link_state,
                                  public.performance_attempt_link_events
from authenticated;

grant select on public.performance_kind_registry,
                public.performance_attempts,
                public.performance_sources,
                public.performance_attempt_link_state,
                public.performance_attempt_link_events,
                public.performance_bests
to authenticated;

revoke all on public.performance_bests from anon;

revoke execute on function public.resolve_active_root_attempt(uuid) from public;
revoke execute on function public.recompute_attempt_canonical_value(uuid) from public;
revoke execute on function public.performance_source_observation(text, text, uuid, uuid) from public;
revoke execute on function public.validate_performance_source() from public;
revoke execute on function public.sync_performance_source_from_benchmark_entry() from public;
revoke execute on function public.sync_performance_source_from_workout() from public;
revoke execute on function public.recompute_after_performance_source_delete() from public;
revoke execute on function public.deny_performance_link_event_mutation() from public;
revoke execute on function public.register_performance_workout_attempt(uuid, text) from public;
revoke execute on function public.register_performance_benchmark_attempt(uuid, text) from public;
revoke execute on function public.attach_performance_source_to_attempt(uuid, text, uuid, uuid) from public;
revoke execute on function public.suggest_performance_attempt_link(uuid, uuid, text) from public;
revoke execute on function public.confirm_performance_attempt_link(uuid, uuid) from public;
revoke execute on function public.reject_performance_attempt_link(uuid, uuid) from public;
revoke execute on function public.reverse_performance_attempt_merge(uuid, uuid) from public;
revoke execute on function public.backfill_performance_attempts_for_current_user(boolean) from public;

grant execute on function public.register_performance_workout_attempt(uuid, text) to authenticated;
grant execute on function public.register_performance_benchmark_attempt(uuid, text) to authenticated;
grant execute on function public.attach_performance_source_to_attempt(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.suggest_performance_attempt_link(uuid, uuid, text) to authenticated;
grant execute on function public.confirm_performance_attempt_link(uuid, uuid) to authenticated;
grant execute on function public.reject_performance_attempt_link(uuid, uuid) to authenticated;
grant execute on function public.reverse_performance_attempt_merge(uuid, uuid) to authenticated;
grant execute on function public.backfill_performance_attempts_for_current_user(boolean) to authenticated;

commit;
