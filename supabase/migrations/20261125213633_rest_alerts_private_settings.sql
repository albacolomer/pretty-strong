-- The rest alerts' cron job needs the project's address and its token
-- (web_push_rest_alerts). The dashboard's SQL editor wouldn't run
-- vault.create_secret, so they live here instead: a table in a schema the
-- Data API doesn't expose, that only the database itself can read. Filled
-- once by hand, never in git (scripts/push-keys.mjs prints the insert):
--   insert into private.settings (name, value) values
--     ('project_url', 'https://<project-ref>.supabase.co'),
--     ('rest_alerts_token', '<token>');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  name text primary key,
  value text not null
);

-- No policies: nobody but the owner (the database itself) reads it.
alter table private.settings enable row level security;
revoke all on private.settings from public, anon, authenticated;

create or replace function public.dispatch_rest_alerts()
returns void
language plpgsql
set search_path = ''
as $$
declare
  project_url text := (select value from private.settings where name = 'project_url');
  token text := (select value from private.settings where name = 'rest_alerts_token');
begin
  if project_url is null or token is null then
    return;
  end if;
  if exists (select 1 from public.scheduled_pushes where send_at <= now()) then
    perform net.http_post(
      url := project_url || '/functions/v1/send-rest-alerts',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', token),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  end if;
end;
$$;

revoke execute on function public.dispatch_rest_alerts() from public, anon, authenticated;
