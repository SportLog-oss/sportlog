-- Allow planned sessions to be deleted while preserving their audit history.
-- The deleted session id remains available inside before_state.

begin;

alter table public.planned_session_events
  alter column planned_session_id drop not null;

create or replace function public.log_planned_session_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  resolved_event_type text;
begin
  if tg_op = 'INSERT' then
    insert into public.planned_session_events (planned_session_id, user_id, event_type, after_state)
    values (new.id, new.user_id, 'created', to_jsonb(new));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.planned_session_events (planned_session_id, user_id, event_type, before_state, reason)
    values (null, old.user_id, 'deleted', to_jsonb(old), 'Geplante Einheit gelöscht');
    return old;
  end if;

  resolved_event_type := case
    when new.status = 'cancelled' and old.status is distinct from new.status then 'cancelled'
    when old.scheduled_date is distinct from new.scheduled_date then 'moved'
    else 'updated'
  end;

  insert into public.planned_session_events
    (planned_session_id, user_id, event_type, before_state, after_state, reason)
  values
    (new.id, new.user_id, resolved_event_type, to_jsonb(old), to_jsonb(new), new.change_reason);
  return new;
end;
$$;

commit;
