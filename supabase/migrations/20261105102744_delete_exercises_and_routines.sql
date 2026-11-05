-- Deleting an exercise or a routine (data rule 3): it's hidden from every
-- list, the archived ones too, but its row stays, so past workouts, the
-- calendar and history keep showing it. Deleting also archives it, so
-- everything that already leaves archived ones out (the library, the plan,
-- the unique exercise names) leaves deleted ones out too. Undo clears it.
-- Only your own rows, under the existing update policies; built-ins have
-- no owner and can't be changed.

alter table public.exercises
  add column deleted_at timestamptz
    constraint exercises_deleted_is_archived_check
      check (deleted_at is null or archived_at is not null);

alter table public.routines
  add column deleted_at timestamptz
    constraint routines_deleted_is_archived_check
      check (deleted_at is null or archived_at is not null);
