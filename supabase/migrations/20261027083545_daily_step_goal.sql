-- Steps a day you aim for, shown on Avui next to the iPhone's step count.
-- The steps themselves stay on the phone (Motion & Fitness); only the goal is
-- stored.
alter table public.profiles
  add column daily_step_goal integer not null default 10000
    constraint profiles_daily_step_goal_check check (daily_step_goal between 1000 and 50000);

-- Changed from Edita el perfil; the RLS update policy (your own row) still
-- applies.
grant update (daily_step_goal) on public.profiles to authenticated;
