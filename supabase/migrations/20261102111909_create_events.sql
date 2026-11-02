-- US-30: competitions and special dates in Profile → Calendar (a marathon,
-- a HYROX, a triathlon…). An event is a date you're aiming for, not
-- something you did: on the day you log it as a session, which keeps its
-- own copy of the name. So events can be deleted (with "Desfés", which
-- saves the same row back; the id is made on the phone).
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The day, on the phone's clock.
  date date not null,
  kind text not null
    constraint events_kind_check check (
      kind in ('marathon', 'half_marathon', 'race', 'trail', 'hyrox', 'spartan', 'triathlon', 'other')
    ),
  -- "Marató de Barcelona". Without one, the app shows the kind's name;
  -- "Altres" needs one.
  name text
    constraint events_name_check check (
      (kind <> 'other' or name is not null)
      and char_length(name) between 1 and 60
    ),
  place text
    constraint events_place_check check (char_length(place) between 1 and 60),
  notes text
    constraint events_notes_check check (char_length(notes) between 1 and 500),
  created_at timestamptz not null default now()
);

create index events_user_date_idx on public.events (user_id, date);

-- Row Level Security: your own rows only (data rule 4).
alter table public.events enable row level security;

create policy "Users can read their own events"
  on public.events for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can add their own events"
  on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can change their own events"
  on public.events for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own events"
  on public.events for delete to authenticated
  using (user_id = (select auth.uid()));
