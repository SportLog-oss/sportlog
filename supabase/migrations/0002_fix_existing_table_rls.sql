-- Fix: RLS on the 4 tables that existed BEFORE 0001 (profiles, workouts, personal_bests,
-- goals_and_races) was blocking the data migration:
--   "new row violates row-level security policy for table goals_and_races"
--
-- Root cause is two compounding gaps on these 4 tables specifically (0001 only ALTERed their
-- columns, it never touched their RLS setup, since the project owner said RLS was "already
-- active" on them):
--   (a) no policy that actually permits INSERT/UPDATE existed (or only a SELECT-only policy did)
--       — Postgres RLS defaults to deny for any command without a matching policy.
--   (b) user_id had no `DEFAULT auth.uid()`, so an insert that doesn't set it explicitly (the
--       app and the migration script both rely on the DB to fill this in, same as every table
--       added in 0001) would try to write NULL — which then ALSO fails "auth.uid() = user_id"
--       even if a correct policy existed, since NULL never equals anything.
--
-- This does NOT disable or weaken RLS anywhere, and does NOT use the service-role key — it adds
-- one complete, correct, owner-only policy (USING for reads/updates/deletes, WITH CHECK for
-- inserts/updates) per table, exactly the same pattern already used for every table created in
-- 0001. Adding this is safe even if other policies already exist on these tables: Postgres OR's
-- multiple permissive policies together, so this one just guarantees the owner-only permission
-- exists — it doesn't need to know about or remove whatever was there before.
--
-- Safe to re-run.

-- 1. Auto-populate user_id on insert, same as every 0001 table already does.
alter table public.workouts alter column user_id set default auth.uid();
alter table public.personal_bests alter column user_id set default auth.uid();
alter table public.goals_and_races alter column user_id set default auth.uid();
-- profiles has no user_id column — its primary key `id` IS the auth.users id (set by the
-- existing signup trigger), so there's nothing to default here.

-- 2. Owner-only RLS, covering select/insert/update/delete in one policy per table.

alter table public.profiles enable row level security;
drop policy if exists "own row" on public.profiles;
create policy "own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

alter table public.workouts enable row level security;
drop policy if exists "own rows" on public.workouts;
create policy "own rows" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.personal_bests enable row level security;
drop policy if exists "own rows" on public.personal_bests;
create policy "own rows" on public.personal_bests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.goals_and_races enable row level security;
drop policy if exists "own rows" on public.goals_and_races;
create policy "own rows" on public.goals_and_races
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
