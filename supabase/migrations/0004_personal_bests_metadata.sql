-- SportLog: personal_bests metadata for automatic PB detection (Batch E)
--
-- Run this ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / DO-block guards).
--
-- The pre-existing `personal_bests` table only has (id, user_id, category, value, workout_id).
-- This adds the fields needed to (a) upsert one row per category instead of accumulating rows,
-- and (b) show "which old record was broken" in the UI after the fact, since by the time the
-- user views the Erfolg page the old value has already been replaced in `value`.

alter table public.personal_bests
  add column if not exists achieved_at          timestamptz not null default now(),
  add column if not exists previous_value        numeric,
  add column if not exists previous_achieved_at  timestamptz;

do $$
begin
  alter table public.personal_bests
    add constraint personal_bests_user_category_unique unique (user_id, category);
exception
  when duplicate_object then null;
end $$;
