-- US-29: changing this week without touching the usual plan. Each row moves
-- one routine away from the day it's planned on (planned_date, a real date
-- in this week) to another day (moved_to), or off the week altogether
-- (moved_to null: dropped, like Sunday's after "Desplaça la setmana").
-- Skipping to the next rest day, shifting the week and "Reprograma la
-- setmana" are all made of these. Sports never move, so only routines
-- have rows. The usual week (weekly_schedule) is never changed.
create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id),
  planned_date date not null,
  -- Within a week either way; never the same day (no row is no move).
  moved_to date
    constraint schedule_overrides_moved_to_check check (
      moved_to <> planned_date and moved_to between planned_date - 7 and planned_date + 7
    ),
  -- Its place on the new day, on the same scale as weekly_schedule's.
  position integer not null default 0
    constraint schedule_overrides_position_check check (position >= 0),
  created_at timestamptz not null default now(),
  -- A routine is planned once a day, so it moves once a day.
  constraint schedule_overrides_once unique (user_id, routine_id, planned_date)
);

create index schedule_overrides_user_moved_to_idx on public.schedule_overrides (user_id, moved_to);

alter table public.schedule_overrides enable row level security;

-- Your own rows, for your own routines (RLS on routines makes the exists
-- true only for yours).
create policy "Users can read their own week changes"
  on public.schedule_overrides for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can change their own week"
  on public.schedule_overrides for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r where r.id = routine_id)
  );
create policy "Users can change their own week changes"
  on public.schedule_overrides for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r where r.id = routine_id)
  );
create policy "Users can undo their own week changes"
  on public.schedule_overrides for delete to authenticated
  using (user_id = (select auth.uid()));

-- All the changes to routines planned between p_from and p_to, replaced in
-- one transaction: a shift moves several at once, and "Desfés" puts the
-- previous ones back exactly. p_moves: [{ routine_id, planned_date,
-- moved_to, position }], each planned in that range. Caller's rights: RLS
-- keeps it to your own rows.
create function public.replace_schedule_overrides(p_from date, p_to date, p_moves jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_to < p_from or p_to - p_from > 14 then
    raise exception 'replace_schedule_overrides: % to % is not a week', p_from, p_to;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_moves) m
    where (m ->> 'planned_date')::date not between p_from and p_to
  ) then
    raise exception 'replace_schedule_overrides: a move planned outside % to %', p_from, p_to;
  end if;

  delete from public.schedule_overrides o
  where o.user_id = (select auth.uid()) and o.planned_date between p_from and p_to;

  insert into public.schedule_overrides (routine_id, planned_date, moved_to, position)
  select
    (m ->> 'routine_id')::uuid,
    (m ->> 'planned_date')::date,
    (m ->> 'moved_to')::date,
    coalesce((m ->> 'position')::integer, 0)
  from jsonb_array_elements(p_moves) m;
end;
$$;

revoke execute on function public.replace_schedule_overrides(date, date, jsonb) from public, anon;
grant execute on function public.replace_schedule_overrides(date, date, jsonb) to authenticated;
