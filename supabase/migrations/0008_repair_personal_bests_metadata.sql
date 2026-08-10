-- SportLog: repair incomplete personal_bests metadata migration in production.
--
-- Production audit on 2026-08-03 confirmed that `achieved_at` exists, while
-- `previous_value` and `previous_achieved_at` are missing. The application reads and writes
-- both fields and relies on one row per (user_id, category) for conflict-safe upserts.
--
-- Safe to re-run:
-- - columns use IF NOT EXISTS
-- - the unique index uses IF NOT EXISTS
-- - existing duplicate categories are detected before the unique index is created

alter table public.personal_bests
  add column if not exists achieved_at          timestamptz not null default now(),
  add column if not exists previous_value        numeric,
  add column if not exists previous_achieved_at  timestamptz;

do $$
begin
  if exists (
    select 1
    from public.personal_bests
    group by user_id, category
    having count(*) > 1
  ) then
    raise exception using
      message = 'Cannot create personal_bests user/category uniqueness: duplicate rows exist.',
      hint = 'Review duplicate personal_bests rows per (user_id, category) before rerunning migration 0008.';
  end if;
end $$;

create unique index if not exists personal_bests_user_category_unique_idx
  on public.personal_bests (user_id, category);
