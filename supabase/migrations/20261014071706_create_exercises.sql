-- US-03: the exercise library.
-- Built-in exercises (owner_id null) come from supabase/seed.sql and have
-- names in ca/es/en. Custom exercises (US-04) belong to one user and have a
-- single name. Exercises are archived (archived_at), never deleted.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  -- Stable key for built-ins, e.g. 'lat_pulldown': seed.sql updates rows by it.
  slug text unique,
  name text,
  name_i18n jsonb,
  tracking_type text not null
    constraint exercises_tracking_type_check check (tracking_type in (
      'weight_reps', 'bodyweight_reps', 'duration', 'weight_distance', 'cardio_machine', 'run'
    )),
  primary_muscles text[] not null default '{}'
    constraint exercises_primary_muscles_check check (primary_muscles <@ array[
      'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'lats', 'upper_back', 'traps',
      'lower_back', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'adductors',
      'abductors', 'calves'
    ]::text[]),
  secondary_muscles text[] not null default '{}'
    constraint exercises_secondary_muscles_check check (secondary_muscles <@ array[
      'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'lats', 'upper_back', 'traps',
      'lower_back', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'adductors',
      'abductors', 'calves'
    ]::text[]),
  -- What you need to do it; 'none' for bodyweight moves and outdoor runs.
  equipment text not null
    constraint exercises_equipment_check check (equipment in (
      'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'smith_machine', 'band',
      'medicine_ball', 'sandbag', 'sled', 'plate', 'ski_erg', 'rower', 'treadmill',
      'stair_climber', 'bike', 'none'
    )),
  -- Logged per side: 10 reps means 10 each side.
  is_unilateral boolean not null default false,
  video_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  -- Built-in: a slug and names in all three languages. Custom: a name, no slug.
  constraint exercises_built_in_or_custom check (
    (owner_id is null and slug is not null and name_i18n ?& array['ca', 'es', 'en'])
    or (owner_id is not null and slug is null and nullif(trim(name), '') is not null)
  )
);

-- RLS looks rows up by owner.
create index exercises_owner_id_idx on public.exercises (owner_id);

-- Row Level Security: everyone signed in reads the built-ins; each user also
-- reads their own custom exercises. No write policies yet, so nobody can
-- change built-ins from the app (custom exercises come with US-04).
alter table public.exercises enable row level security;

create policy "Users can read built-in exercises and their own"
  on public.exercises for select
  to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
