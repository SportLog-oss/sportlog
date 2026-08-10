-- SportLog 2.0: atomic, user-owned Plan-Ist confirmation.
begin;

create unique index if not exists planned_session_workouts_confirmed_workout_unique_idx
  on public.planned_session_workouts (user_id, workout_id)
  where match_status = 'confirmed';

create or replace function public.set_planned_session_workout_match(
  p_session_id uuid, p_workout_id uuid, p_status text, p_score numeric default null, p_reasons jsonb default '[]'::jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if p_status not in ('confirmed', 'rejected') then raise exception 'Invalid match status'; end if;
  if not exists (select 1 from public.planned_sessions where id = p_session_id and user_id = v_user_id) then raise exception 'Planned session not found'; end if;
  if not exists (select 1 from public.workouts where id = p_workout_id and user_id = v_user_id) then raise exception 'Workout not found'; end if;
  insert into public.planned_session_workouts (planned_session_id, workout_id, user_id, match_status, match_score, match_reasons, confirmed_at)
  values (p_session_id, p_workout_id, v_user_id, p_status, p_score, p_reasons, case when p_status='confirmed' then now() else null end)
  on conflict (planned_session_id, workout_id) do update set match_status=excluded.match_status, match_score=excluded.match_score, match_reasons=excluded.match_reasons, confirmed_at=excluded.confirmed_at;
  insert into public.planned_session_events (planned_session_id, user_id, event_type, after_state, reason)
  values (p_session_id, v_user_id, 'match_added', jsonb_build_object('workout_id',p_workout_id,'status',p_status,'score',p_score), 'Plan-Ist-Zuordnung');
end; $$;

create or replace function public.remove_planned_session_workout_match(p_session_id uuid, p_workout_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_before jsonb;
begin
  delete from public.planned_session_workouts as psw where psw.planned_session_id=p_session_id and psw.workout_id=p_workout_id and psw.user_id=v_user_id returning to_jsonb(psw.*) into v_before;
  if v_before is not null then insert into public.planned_session_events (planned_session_id,user_id,event_type,before_state,reason) values (p_session_id,v_user_id,'match_removed',v_before,'Plan-Ist-Zuordnung entfernt'); end if;
end; $$;

commit;
