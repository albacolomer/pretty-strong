-- US-28: "Amaga les fotos de progrés". When on, progress photos show
-- blurred until Face ID (or the phone's passcode) unlocks them, like the
-- iPhone's Hidden album. Kept on your profile, so it holds on any phone
-- you sign in on. Your own row only, through the existing RLS policy.
alter table public.profiles
  add column hide_progress_photos boolean not null default false;

grant update (hide_progress_photos) on public.profiles to authenticated;
