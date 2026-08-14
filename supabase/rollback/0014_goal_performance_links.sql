begin;

drop index if exists public.goals_and_races_user_performance_kind_idx;
alter table public.goals_and_races drop column if exists performance_kind;

commit;
