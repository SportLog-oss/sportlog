-- Batch F: persistent weight history for manual and AthleteData measurements.

create table if not exists public.weight_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null,
  measured_at timestamptz not null default now(),
  weight_kg   numeric(5,2) not null check (weight_kg between 20 and 400),
  source      text not null check (source in ('manual', 'athlete_data')),
  created_at  timestamptz not null default now(),
  unique (user_id, source, measured_on)
);

create index if not exists weight_log_user_date_idx
  on public.weight_log (user_id, measured_on desc);

alter table public.weight_log enable row level security;
drop policy if exists "own rows" on public.weight_log;
create policy "own rows"
  on public.weight_log
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Preserve weight values that were already present in the latest AthleteData cache.
insert into public.weight_log (user_id, measured_on, measured_at, weight_kg, source)
select
  cache.user_id,
  (metric->>'date')::date,
  ((metric->>'date') || 'T12:00:00.000Z')::timestamptz,
  (metric->>'weight')::numeric,
  'athlete_data'
from public.app_cache as cache
cross join lateral jsonb_array_elements(coalesce(cache.data->'rows', '[]'::jsonb)) as metric
where cache.cache_key = 'daily-metrics'
  and metric->>'date' is not null
  and metric->>'weight' is not null
  and jsonb_typeof(metric->'weight') = 'number'
on conflict (user_id, source, measured_on)
do update set
  measured_at = excluded.measured_at,
  weight_kg = excluded.weight_kg;

-- One database operation keeps the profile's current value and its history in sync.
create or replace function public.record_weight(
  p_weight_kg numeric,
  p_measured_on date default current_date,
  p_measured_at timestamptz default now()
)
returns setof public.weight_log
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.weight_log (user_id, measured_on, measured_at, weight_kg, source)
  values (auth.uid(), p_measured_on, p_measured_at, p_weight_kg, 'manual')
  on conflict (user_id, source, measured_on)
  do update set
    measured_at = excluded.measured_at,
    weight_kg = excluded.weight_kg
  returning id into v_id;

  update public.profiles
  set weight_kg = p_weight_kg
  where id = auth.uid();

  return query
  select wl.*
  from public.weight_log as wl
  where wl.id = v_id;
end;
$$;

revoke all on function public.record_weight(numeric, date, timestamptz) from public;
grant execute on function public.record_weight(numeric, date, timestamptz) to authenticated;
