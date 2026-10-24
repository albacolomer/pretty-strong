-- US-28: Profile → Body. Your body weight and measurements, one value per
-- day: logging again the same day replaces it. Changes over time are
-- worked out from these, never stored (data rule 2).
--
-- The spec sketched one body_metrics table (date, type, value), but kg and
-- cm in one value column would break data rule 6 (units in column names),
-- so weights and measurements get a table each.

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The day it was weighed, on the phone's clock.
  date date not null,
  weight_kg numeric(5, 2) not null
    constraint body_weights_weight_check check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  constraint body_weights_one_a_day unique (user_id, date)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  -- One of the usual ones, or 'custom' with a name of your own.
  part text not null
    constraint body_measurements_part_check
      check (part in ('waist', 'hips', 'chest', 'arm', 'thigh', 'custom')),
  custom_name text
    constraint body_measurements_custom_name_check check (
      (part = 'custom') = (custom_name is not null)
      and char_length(custom_name) between 1 and 40
    ),
  value_cm numeric(5, 1) not null
    constraint body_measurements_value_check check (value_cm between 1 and 300),
  created_at timestamptz not null default now(),
  -- Built-ins have no custom_name: nulls count as equal here.
  constraint body_measurements_one_a_day unique nulls not distinct (user_id, part, custom_name, date)
);

-- Row Level Security: your own rows only (data rule 4).
alter table public.body_weights enable row level security;
alter table public.body_measurements enable row level security;

create policy "Users can read their own weights"
  on public.body_weights for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can log their own weights"
  on public.body_weights for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can change their own weights"
  on public.body_weights for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own weights"
  on public.body_weights for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read their own measurements"
  on public.body_measurements for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can log their own measurements"
  on public.body_measurements for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can change their own measurements"
  on public.body_measurements for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own measurements"
  on public.body_measurements for delete to authenticated
  using (user_id = (select auth.uid()));
