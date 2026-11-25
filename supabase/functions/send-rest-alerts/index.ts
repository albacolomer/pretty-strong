// Sends the web app's due rest alerts as web pushes (spec: "Web app").
// Called every few seconds by the database's cron job, only when an alert
// is due (see the web_push_rest_alerts migration). Each due alert is taken
// off the queue as it is read, so two calls never send it twice; one that
// can't be sent is dropped (a late "rest is over" is no use).
//
// Secrets (scripts/push-keys.mjs): REST_ALERTS_TOKEN, VAPID_KEYS.
// Deployed with JWT checking off: the cron job has no user, the token
// stands in for it.

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  Urgency,
} from 'jsr:@negrel/webpush@0.5.0';

// Older than this, the rest ended long ago (the job was down): skip it.
const STALE_MS = 2 * 60 * 1000;
// The push service keeps trying for at most this long.
const TTL_S = 60;
// Named in each push, as RFC 8292 asks; the app's address, not a person's.
const CONTACT = 'https://prettystrong.vercel.app';

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) return JSON.parse(keys).default;
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

// The server's own key: it reads every user's queue, so only here.
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
  auth: { persistSession: false },
});

const pushServer = await ApplicationServer.new({
  contactInformation: CONTACT,
  vapidKeys: await importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS')!)),
});

type Alert = { id: string; user_id: string; send_at: string; title: string; body: string };
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async (request) => {
  const token = Deno.env.get('REST_ALERTS_TOKEN');
  if (!token || request.headers.get('x-cron-token') !== token) {
    return new Response('Forbidden', { status: 403 });
  }

  const now = Date.now();
  const { data: due, error } = await supabase
    .from('scheduled_pushes')
    .delete()
    .lte('send_at', new Date(now).toISOString())
    .select('id, user_id, send_at, title, body')
    .returns<Alert[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const alerts = due.filter((alert) => now - Date.parse(alert.send_at) < STALE_MS);
  if (alerts.length === 0) return Response.json({ sent: 0 });

  const { data: subscriptions, error: readError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', [...new Set(alerts.map((alert) => alert.user_id))])
    .returns<Subscription[]>();
  if (readError) return Response.json({ error: readError.message }, { status: 500 });

  let sent = 0;
  // Installs the push service no longer knows (removed from the Home
  // Screen, notifications turned off): forgotten.
  const gone: string[] = [];
  await Promise.all(
    alerts.flatMap((alert) =>
      subscriptions
        .filter((subscription) => subscription.user_id === alert.user_id)
        .map(async (subscription) => {
          try {
            await pushServer
              .subscribe({
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              })
              .pushTextMessage(JSON.stringify({ title: alert.title, body: alert.body }), {
                urgency: Urgency.High,
                ttl: TTL_S,
              });
            sent += 1;
          } catch (caught) {
            if (
              caught instanceof PushMessageError &&
              (caught.isGone() || caught.response.status === 404)
            ) {
              gone.push(subscription.id);
            } else {
              console.error('push failed', String(caught));
            }
          }
        }),
    ),
  );
  if (gone.length > 0) await supabase.from('push_subscriptions').delete().in('id', gone);

  return Response.json({ sent, gone: gone.length });
});
