-- SportLog 2.0: athlete reflection after a confirmed Plan-Ist match.
--
-- Local design migration. Do not execute in production without separate approval.

begin;

create unique index if not exists planned_session_workouts_owner_unique_idx
  on public.planned_session_workouts (planned_session_id, workout_id, user_id);

create table if not exists public.training_reflections (
  planned_session_id  uuid not null,
  workout_id          uuid not null,
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  feeling             text,
  perceived_exertion  smallint,
  deviation_reason    text,
  note                text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (planned_session_id, workout_id),
  constraint training_reflections_match_owner_fk
    foreign key (planned_session_id, workout_id, user_id)
    references public.planned_session_workouts(planned_session_id, workout_id, user_id) on delete cascade,
  constraint training_reflections_feeling_check
    check (feeling is null or feeling in ('great', 'good', 'okay', 'hard', 'bad')),
  constraint training_reflections_rpe_check
    check (perceived_exertion is null or perceived_exertion between 1 and 10),
  constraint training_reflections_reason_check
    check (deviation_reason is null or deviation_reason in ('felt-good', 'felt-tired', 'schedule', 'conditions', 'plan-adjustment', 'other')),
  constraint training_reflections_note_length_check check (char_length(note) <= 1000)
);

create index if not exists training_reflections_user_updated_idx
  on public.training_reflections (user_id, updated_at desc);

alter table public.training_reflections enable row level security;

drop policy if exists "training_reflections own rows" on public.training_reflections;
create policy "training_reflections own rows" on public.training_reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
