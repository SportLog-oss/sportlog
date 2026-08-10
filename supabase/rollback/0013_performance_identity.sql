-- Local rollback for migration 0013_performance_identity.sql.
-- This intentionally removes only objects introduced by migration 0013.

begin;

drop view if exists public.performance_bests;

drop trigger if exists performance_attempt_link_events_immutable on public.performance_attempt_link_events;
drop trigger if exists performance_sources_after_delete on public.performance_sources;
drop trigger if exists workouts_sync_performance_source on public.workouts;
drop trigger if exists benchmark_entries_sync_performance_source on public.benchmark_entries;
drop trigger if exists performance_sources_validate on public.performance_sources;

drop function if exists public.backfill_performance_attempts_for_current_user(boolean);
drop function if exists public.reverse_performance_attempt_merge(uuid, uuid);
drop function if exists public.reject_performance_attempt_link(uuid, uuid);
drop function if exists public.confirm_performance_attempt_link(uuid, uuid);
drop function if exists public.suggest_performance_attempt_link(uuid, uuid, text);
drop function if exists public.attach_performance_source_to_attempt(uuid, text, uuid, uuid);
drop function if exists public.register_performance_benchmark_attempt(uuid, text);
drop function if exists public.register_performance_workout_attempt(uuid, text);
drop function if exists public.deny_performance_link_event_mutation();
drop function if exists public.recompute_after_performance_source_delete();
drop function if exists public.sync_performance_source_from_workout();
drop function if exists public.sync_performance_source_from_benchmark_entry();
drop function if exists public.validate_performance_source();
drop function if exists public.performance_source_observation(text, text, uuid, uuid);
drop function if exists public.recompute_attempt_canonical_value(uuid);
drop function if exists public.resolve_active_root_attempt(uuid);

drop table if exists public.performance_attempt_link_events;
drop table if exists public.performance_attempt_link_state;
drop table if exists public.performance_sources;
drop table if exists public.performance_attempts;

alter table public.benchmarks drop column if exists performance_kind;
drop table if exists public.performance_kind_registry;

drop index if exists public.benchmarks_id_user_unique_idx;
drop index if exists public.benchmark_entries_id_user_unique_idx;
drop index if exists public.workouts_id_user_unique_idx;

commit;
