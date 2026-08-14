-- SportLog 2.0: exact goal-to-performance linking.
-- Additive only. A goal can reference one canonical performance kind; the current
-- value remains derived from performance_bests and is not copied into the goal row.

begin;

alter table public.goals_and_races
  add column if not exists performance_kind text
    references public.performance_kind_registry(kind) on delete restrict;

create index if not exists goals_and_races_user_performance_kind_idx
  on public.goals_and_races (user_id, performance_kind)
  where type = 'goal' and performance_kind is not null;

-- Safe legacy backfill: only the established 2-km time goal in seconds is linked.
update public.goals_and_races
set performance_kind = 'rowing_2000m'
where type = 'goal'
  and performance_kind is null
  and category = 'leistung'
  and lower(coalesce(unit, '')) in ('sekunde', 'sekunden', 's')
  and (
    lower(replace(coalesce(metric_label, ''), ' ', '')) like '%2km%'
    or lower(replace(coalesce(metric_label, ''), ' ', '')) like '%2000m%'
    or lower(replace(coalesce(title, ''), ' ', '')) like '%2km%'
    or lower(replace(coalesce(title, ''), ' ', '')) like '%2000m%'
  );

commit;
