-- US-31: the steps the iPhone counted each day, for Profile → Calendar.
-- The phone (Motion & Fitness) only keeps the last 7 days, so the app saves
-- them whenever it opens; older days live only here. A count the phone
-- measured is a raw fact (data rule 2); whether a day reached the goal is
-- worked out from it, never stored.
create table public.daily_steps (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The day, on the phone's clock.
  date date not null,
  steps integer not null
    constraint daily_steps_steps_check check (steps between 1 and 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- Row Level Security: your own rows only (data rule 4). Written through
-- save_daily_steps(), which runs with your rights, so it needs insert and
-- update; nothing deletes a day.
alter table public.daily_steps enable row level security;

create policy "Users can read their own steps"
  on public.daily_steps for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can save their own steps"
  on public.daily_steps for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can update their own steps"
  on public.daily_steps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The phone's counts for several days, saved at once. p_days: [{ date,
-- steps }]. A day already saved only changes when the new count is higher:
-- a day's count only grows while the phone keeps it, and a new phone (which
-- knows nothing of the days before it) can't wipe what was saved.
create function public.save_daily_steps(p_days jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into public.daily_steps (date, steps)
  select (d ->> 'date')::date, (d ->> 'steps')::integer
  from jsonb_array_elements(p_days) d
  on conflict (user_id, date) do update
    set steps = excluded.steps, updated_at = now()
    where excluded.steps > public.daily_steps.steps;
$$;

revoke execute on function public.save_daily_steps(jsonb) from public, anon;
grant execute on function public.save_daily_steps(jsonb) to authenticated;
