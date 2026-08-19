-- SportLog 2.0: read-only external calendar context (Kalenderkontext V1).
--
-- Local design migration. Do not execute in production without a separate approval.
-- Safe to re-run: table and indexes are guarded; policy is replaced deterministically.
--
-- Product decision (Arbeitsliste 001, Abschnitt 3): a calendar event never becomes a
-- planned training session automatically, and private events are never modified by
-- SportLog. This table only mirrors what AthleteData already exposes read-only from
-- Apple Calendar and Google Calendar, so the plan can show conflicts and free time as
-- context without turning a personal appointment into training data.

begin;

create extension if not exists pgcrypto;

create table if not exists public.calendar_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source              text not null,
  external_event_id   text not null,
  calendar_name       text not null default '',
  title               text not null default '',
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  all_day             boolean not null default false,
  is_free             boolean not null default false,
  is_canceled         boolean not null default false,
  self_is_organizer   boolean,
  self_is_attendee    boolean,
  self_response       text,
  last_synced_at      timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint calendar_events_source_check check (source in ('apple', 'google')),
  constraint calendar_events_time_check check (ends_at >= starts_at),
  constraint calendar_events_external_id_unique unique (user_id, source, external_event_id)
);

-- Upcoming-events and conflict lookups always scope by user and time range.
create index if not exists calendar_events_user_time_idx
  on public.calendar_events (user_id, starts_at, ends_at);

alter table public.calendar_events enable row level security;
drop policy if exists "calendar_events own rows" on public.calendar_events;
create policy "calendar_events own rows" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
