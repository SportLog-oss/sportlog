-- SportLog 2.0: eigenständige Google-Calendar-OAuth-Anbindung (Arbeitsliste 001, Abschnitt 3 /
-- Teil 7, 01.09.2026). Bewusst unabhängig von der AthleteData-Google-Kalender-Verbindung — eigenes
-- Google-Cloud-Projekt, eigene Client-ID/Secret, nur Lesezugriff (calendar.readonly).
--
-- Ein Token-Paar pro Nutzer (Primärschlüssel = user_id). needs_reauth wird gesetzt, sobald ein
-- Refresh fehlschlägt (z. B. weil der Consent-Screen im Testing-Modus steht und der Refresh-Token
-- nach 7 Tagen abläuft) — die Profilseite zeigt dann einen Re-Connect-Hinweis statt eines stillen
-- Fehlschlags, wie von Marcel gefordert.

begin;

create table if not exists public.google_calendar_connections (
  user_id           uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  google_email      text,
  access_token      text not null,
  refresh_token     text not null,
  token_expires_at  timestamptz not null,
  needs_reauth      boolean not null default false,
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

drop policy if exists "google_calendar_connections_owner" on public.google_calendar_connections;
create policy "google_calendar_connections_owner" on public.google_calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
