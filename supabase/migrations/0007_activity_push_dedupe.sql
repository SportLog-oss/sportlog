-- Exactly-once guard for "new Garmin activity" push notifications.

create table if not exists public.activity_push_notifications (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  external_id text not null,
  activity_id bigint not null,
  status      text not null check (status in ('claimed', 'sent')),
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  primary key (user_id, external_id)
);

alter table public.activity_push_notifications enable row level security;
drop policy if exists "own rows" on public.activity_push_notifications;
create policy "own rows"
  on public.activity_push_notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.expo_push_receipt_tickets (
  ticket_id   text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token       text not null,
  created_at  timestamptz not null default now()
);

alter table public.expo_push_receipt_tickets enable row level security;
drop policy if exists "own rows" on public.expo_push_receipt_tickets;
create policy "own rows"
  on public.expo_push_receipt_tickets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
