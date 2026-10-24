-- US-28: progress photos, and a profile picture. The pictures live in a
-- private Storage bucket, each user's under a folder named after their id
-- ("<user id>/progress/<uuid>.jpg", "<user id>/avatar/<uuid>.jpg"); the
-- app shows them through short-lived signed links. The database keeps
-- only where they are.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 15728640, array['image/jpeg']);

-- Your own folder only (data rule 4): read, upload, replace and delete.
create policy "Users can see their own photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users can upload their own photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users can replace their own photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users can delete their own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The day it was taken.
  date date not null,
  -- Where it is in the photos bucket, inside your own folder.
  storage_path text not null unique
    constraint progress_photos_path_check check (split_part(storage_path, '/', 1) = user_id::text),
  created_at timestamptz not null default now()
);

create index progress_photos_user_date_idx on public.progress_photos (user_id, date);

alter table public.progress_photos enable row level security;

create policy "Users can see their own progress photos"
  on public.progress_photos for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can add their own progress photos"
  on public.progress_photos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own progress photos"
  on public.progress_photos for delete to authenticated
  using (user_id = (select auth.uid()));

-- The profile picture, in the same bucket; null shows your initial.
alter table public.profiles
  add column avatar_path text
    constraint profiles_avatar_path_check check (split_part(avatar_path, '/', 1) = id::text);

grant update (avatar_path) on public.profiles to authenticated;
