-- Rest alerts on the web app (spec: "Web app", decided Nov 2026). The
-- iPhone app schedules a local notification for the end of rest; a web
-- page can't (iOS freezes it when locked), so the server sends a push at
-- that moment instead. Only for the app added to the Home Screen.
--
-- push_subscriptions: where pushes for a user can go (one row per
-- installed web app). scheduled_pushes: alerts waiting for their moment.
-- Every few seconds, pg_cron checks for a due alert and only then calls the
-- send-rest-alerts Edge Function, which sends and removes it.
--
-- Before this works, the Vault needs two secrets (made once by
-- scripts/push-keys.mjs, never in git): 'project_url' and
-- 'rest_alerts_token'.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The push service's address for this install, and its two keys
  -- (PushSubscription.toJSON(), base64url).
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_once unique (user_id, endpoint),
  constraint push_subscriptions_endpoint check (endpoint like 'https://%' and length(endpoint) <= 1000),
  constraint push_subscriptions_keys check (length(p256dh) <= 200 and length(auth) <= 100)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can add their own push subscriptions"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can remove their own push subscriptions"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.scheduled_pushes (
  -- Made on the phone, like the rest timer's id, so the app can cancel it.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  send_at timestamptz not null,
  -- Already translated: "Descans acabat", "Següent: Rem assegut, sèrie 3".
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  constraint scheduled_pushes_text check (length(title) <= 100 and length(body) <= 200),
  -- A rest, not a reminder: within the next couple of hours.
  constraint scheduled_pushes_soon check (send_at <= created_at + interval '2 hours')
);

create index scheduled_pushes_send_at_idx on public.scheduled_pushes (send_at);

alter table public.scheduled_pushes enable row level security;

create policy "Users can read their own scheduled pushes"
  on public.scheduled_pushes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can schedule their own pushes"
  on public.scheduled_pushes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can cancel their own scheduled pushes"
  on public.scheduled_pushes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Run by pg_cron: calls the function only when an alert is due, so it
-- costs nothing while nobody is resting. The token tells the function the
-- call is ours; it can only make due alerts go out.
create function public.dispatch_rest_alerts()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.scheduled_pushes where send_at <= now()) then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-rest-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'rest_alerts_token')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  end if;
end;
$$;

revoke execute on function public.dispatch_rest_alerts() from public, anon, authenticated;

select cron.schedule('send-rest-alerts', '5 seconds', 'select public.dispatch_rest_alerts()');
