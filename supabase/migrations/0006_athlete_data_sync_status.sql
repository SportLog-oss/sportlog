-- Batch H: one real AthleteData synchronization status per user.

create table if not exists public.athlete_data_sync_status (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  status          text not null default 'never'
                  check (status in ('never', 'syncing', 'success', 'partial', 'failed')),
  trigger         text check (trigger in ('manual', 'cron', 'external_push')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  completed_at    timestamptz,
  saved_keys      text[] not null default '{}',
  failures        jsonb not null default '[]',
  updated_at      timestamptz not null default now()
);

alter table public.athlete_data_sync_status enable row level security;
drop policy if exists "own rows" on public.athlete_data_sync_status;
create policy "own rows"
  on public.athlete_data_sync_status
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Existing installations already have trustworthy per-cache timestamps. Seed the status from
-- their latest successful AthleteData cache write instead of incorrectly showing "never".
insert into public.athlete_data_sync_status (
  user_id,
  status,
  trigger,
  last_attempt_at,
  last_success_at,
  completed_at,
  saved_keys
)
select
  user_id,
  'success',
  'cron',
  max(coalesce(fetched_at, updated_at)),
  max(coalesce(fetched_at, updated_at)),
  max(coalesce(fetched_at, updated_at)),
  array_agg(cache_key order by cache_key)
from public.app_cache
group by user_id
on conflict (user_id) do nothing;
