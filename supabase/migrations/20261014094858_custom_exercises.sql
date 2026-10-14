-- US-04: users can create and change their own custom exercises.
-- Built-ins (owner_id null) stay read-only for everyone. There is no delete
-- policy: exercises are archived (archived_at), never deleted.
-- The exercises_built_in_or_custom check already makes sure a custom
-- exercise has a name and no slug.

create policy "Users can create their own exercises"
  on public.exercises for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Users can update their own exercises"
  on public.exercises for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- One active custom exercise per name for each user, ignoring capitals and
-- surrounding spaces. Archived ones don't count, so a name can be reused.
create unique index exercises_owner_name_unique
  on public.exercises (owner_id, lower(trim(name)))
  where owner_id is not null and archived_at is null;
