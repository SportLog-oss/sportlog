-- SportLog 2.0: Krankheit/Schmerzen <-> Trainingseinheit (Konzept 005, Ergänzung 3).
--
-- Purely additive: two nullable/defaulted columns so a manual correction of the
-- automatic date-proximity match between an illness/pain entry and a planned session
-- can persist. Approved by Marcel for direct execution (01.09.2026).
--
-- linked_session_id: NULL means "undecided" (the UI computes an automatic suggestion
-- by date proximity); a real planned_sessions.id means a confirmed or manually chosen
-- link. linked_session_dismissed: true means the user explicitly rejected a suggestion
-- without picking a replacement, so the UI must not keep re-suggesting one.

begin;

alter table public.illness_log
  add column if not exists linked_session_id uuid references public.planned_sessions(id) on delete set null,
  add column if not exists linked_session_dismissed boolean not null default false;

commit;
