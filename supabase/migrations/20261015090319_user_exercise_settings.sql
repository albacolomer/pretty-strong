-- US-05: your personal layer on any exercise, built-in or your own: notes
-- (seat height, cues) and a default rest. One row per user and exercise.
-- Built-ins stay untouched, so a note on a shared exercise is only yours.

create table public.user_exercise_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  notes text
    constraint user_exercise_settings_notes_length check (char_length(notes) <= 1000),
  -- Empty means "use the app's default rest".
  default_rest_s integer
    constraint user_exercise_settings_rest_range check (default_rest_s between 0 and 600),
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- Row Level Security: users read and write only their own settings, and
-- only on exercises they can see. The exists() runs under the exercises
-- RLS, so it only finds built-ins and the user's own exercises.
-- No delete policy: clearing a note just empties it.
alter table public.user_exercise_settings enable row level security;

create policy "Users can read their own exercise settings"
  on public.user_exercise_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add settings to exercises they can see"
  on public.user_exercise_settings for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "Users can update their own exercise settings"
  on public.user_exercise_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );
