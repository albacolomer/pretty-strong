-- Edita el perfil: a bio, your gender and your birth date. The bio takes
-- over from focus ("Què entrenes"), so what was there becomes its start.
alter table public.profiles
  add column bio text
    constraint profiles_bio_length check (char_length(bio) <= 150),
  -- Empty: you'd rather not say.
  add column gender text
    constraint profiles_gender_check check (gender in ('female', 'male', 'non_binary')),
  -- Your age is worked out from it in the app, never stored (data rule 2).
  add column birth_date date
    constraint profiles_birth_date_check check (birth_date >= date '1900-01-01');

update public.profiles set bio = focus where focus is not null;

alter table public.profiles drop column focus;

-- The RLS update policy (your own row) still applies.
grant update (bio, gender, birth_date) on public.profiles to authenticated;
