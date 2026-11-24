-- US-29: Setmana shows real weeks, and anything on a day can come off it
-- for that week only. Routines already do (schedule_overrides with
-- moved_to null); this is the same for a sport of the usual week
-- (weekly_sports). Moving a sport, or changing its time, for one week only
-- is this plus a copy in schedule_additions on the new day or time.
create table public.schedule_sport_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Gone from the usual week: nothing left to drop.
  weekly_sport_id uuid not null references public.weekly_sports (id) on delete cascade,
  -- The date it's off: a day the usual week has it on.
  date date not null,
  created_at timestamptz not null default now(),
  constraint schedule_sport_drops_once unique (user_id, weekly_sport_id, date)
);

create index schedule_sport_drops_user_date_idx on public.schedule_sport_drops (user_id, date);

alter table public.schedule_sport_drops enable row level security;

-- Your own rows, for your own sports (RLS on weekly_sports makes the
-- exists true only for yours).
create policy "Users can read their own sport drops"
  on public.schedule_sport_drops for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can drop their own sports"
  on public.schedule_sport_drops for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.weekly_sports s where s.id = weekly_sport_id)
  );
create policy "Users can change their own sport drops"
  on public.schedule_sport_drops for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.weekly_sports s where s.id = weekly_sport_id)
  );
create policy "Users can undo their own sport drops"
  on public.schedule_sport_drops for delete to authenticated
  using (user_id = (select auth.uid()));

-- Every sport dropped between p_from and p_to, replaced in one transaction,
-- like replace_schedule_overrides(): "Desfés els canvis" clears them, and
-- "Desfés" puts the previous ones back exactly. p_drops:
-- [{ weekly_sport_id, date }], each in that range. Caller's rights: RLS
-- keeps it to your own rows.
create function public.replace_sport_drops(p_from date, p_to date, p_drops jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_to < p_from or p_to - p_from > 14 then
    raise exception 'replace_sport_drops: % to % is not a week', p_from, p_to;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_drops) d
    where (d ->> 'date')::date not between p_from and p_to
  ) then
    raise exception 'replace_sport_drops: a drop outside % to %', p_from, p_to;
  end if;

  delete from public.schedule_sport_drops d
  where d.user_id = (select auth.uid()) and d.date between p_from and p_to;

  insert into public.schedule_sport_drops (weekly_sport_id, date)
  select (d ->> 'weekly_sport_id')::uuid, (d ->> 'date')::date
  from jsonb_array_elements(p_drops) d;
end;
$$;

revoke execute on function public.replace_sport_drops(date, date, jsonb) from public, anon;
grant execute on function public.replace_sport_drops(date, date, jsonb) to authenticated;
