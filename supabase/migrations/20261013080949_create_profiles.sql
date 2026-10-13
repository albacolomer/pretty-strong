-- US-01: one profile per user, created automatically when the account is created.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  language text not null default 'ca'
    constraint profiles_language_supported check (language in ('ca', 'es', 'en')),
  created_at timestamptz not null default now()
);

-- Row Level Security: users see and change only their own profile.
-- There are no insert or delete policies: the trigger below creates the row,
-- and it is deleted together with the auth user.
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Only username and language can be changed from the app.
revoke update on public.profiles from authenticated;
grant update (username, language) on public.profiles to authenticated;

-- Creates the profile from the username and language sent with signUp().
-- Users created from the dashboard get a placeholder username.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_language text := new.raw_user_meta_data ->> 'language';
begin
  insert into public.profiles (id, username, language)
  values (
    new.id,
    coalesce(
      nullif(lower(trim(new.raw_user_meta_data ->> 'username')), ''),
      'user_' || left(replace(new.id::text, '-', ''), 8)
    ),
    case when requested_language in ('ca', 'es', 'en') then requested_language else 'ca' end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form check a username before creating the account.
-- RLS hides other users' profiles, so this function only answers yes or no.
create function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(candidate))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
