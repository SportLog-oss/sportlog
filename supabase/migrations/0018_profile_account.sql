-- SportLog 2.0: erweiterter Konto-Bereich auf Profil (Konzept: Profil Web, 01.09.2026).
--
-- Purely additive: Name/Sportart/Verein/Trainer als freier Text auf der bestehenden
-- profiles-Tabelle, plus ein privater Storage-Bucket für das Profilbild mit RLS, die den
-- Zugriff strikt auf den jeweils eingeloggten Nutzer beschränken (Objektpfad-Konvention:
-- "<user_id>/avatar.<ext>", geprüft über storage.foldername). Approved by Marcel for
-- direct execution (01.09.2026).

begin;

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists sport_type text,
  add column if not exists club text,
  add column if not exists trainer_name text,
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects
  for select using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

commit;
