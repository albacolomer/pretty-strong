-- US-11, US-12, US-20: workout sessions, the log. For now Today uses them to
-- mark a planned routine done (a quick log) or skipped; live workouts with
-- their exercises and sets (session_exercises, sets) come with the logger.

create table public.workout_sessions (
  -- Made on the phone (data rule 5), so a retry after losing signal can't
  -- save the same session twice.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The calendar day it belongs to, on the phone's clock.
  date date not null,
  -- What the week planned that day, and what was actually done: they differ
  -- after a swap, and routine_id is empty for a skipped day.
  planned_routine_id uuid references public.routines (id),
  routine_id uuid references public.routines (id),
  status text not null
    constraint workout_sessions_status_check check (status in ('in_progress', 'completed', 'skipped')),
  log_mode text not null default 'live'
    constraint workout_sessions_log_mode_check check (log_mode in ('live', 'quick')),
  -- A live workout's real times; its length is ended_at - started_at.
  started_at timestamptz,
  ended_at timestamptz,
  -- A quick log's length, when given: it has no real start and end times.
  duration_s integer
    constraint workout_sessions_duration_check check (duration_s between 60 and 86400),
  energy smallint
    constraint workout_sessions_energy_check check (energy between 1 and 5),
  notes text
    constraint workout_sessions_notes_length check (char_length(notes) <= 1000),
  -- Why the day was skipped or swapped, when you say so.
  change_reason text
    constraint workout_sessions_change_reason_check
      check (change_reason in ('tired', 'unwell', 'no_time', 'other')),
  -- Where it came from (data rule 8): only typed in the app for now; imports
  -- from a watch later, with their own id there.
  source text not null default 'manual'
    constraint workout_sessions_source_check check (source in ('manual')),
  external_id text,
  created_at timestamptz not null default now()
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, date);

-- Row Level Security: your own sessions only, and only of your own
-- routines (the exists() run under the routines RLS). Sessions can be
-- deleted: "Desfés" now, and deleting past workouts later (US-23).
alter table public.workout_sessions enable row level security;

create policy "Users can read their own sessions"
  on public.workout_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can log their own sessions"
  on public.workout_sessions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (planned_routine_id is null
      or exists (select 1 from public.routines r where r.id = planned_routine_id))
    and (routine_id is null
      or exists (select 1 from public.routines r where r.id = routine_id))
  );

create policy "Users can change their own sessions"
  on public.workout_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (planned_routine_id is null
      or exists (select 1 from public.routines r where r.id = planned_routine_id))
    and (routine_id is null
      or exists (select 1 from public.routines r where r.id = routine_id))
  );

create policy "Users can delete their own sessions"
  on public.workout_sessions for delete
  to authenticated
  using (user_id = (select auth.uid()));
