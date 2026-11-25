import { randomUUID } from 'expo-crypto';

import { base64UrlToBytes } from './base64Url';
import { supabase } from './supabase';

// The web's rest alerts (spec: "Web app"). A browser can't schedule a
// notification for later, and iOS freezes the page when it's locked, so the
// alert is queued in Supabase and sent as a web push at its moment (the
// send-rest-alerts function). Same calls as the phone's lib/notifications:
// the rest timer doesn't know the difference.
//
// iOS allows push only in the app added to the Home Screen (16.4 or later);
// in Safari itself these quietly do nothing. Without signal the alert can't
// be queued: the rest bar still counts down.

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

function pushAvailable(): boolean {
  return (
    // No service worker in development (lib/appUpdates.web.ts).
    !__DEV__ &&
    !!VAPID_PUBLIC_KEY &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'PushManager' in window &&
    'serviceWorker' in navigator
  );
}

function allowed(): boolean {
  return pushAvailable() && Notification.permission === 'granted';
}

// Banners while the app is open are the service worker's (it must show
// every push it gets), so nothing to set here.
export function setWorkoutScreenOpen(_open: boolean) {}

export function configureNotifications() {}

// Asks once, from the tap that starts a workout (iOS asks only then), and
// registers this install with Supabase so pushes can reach it. Done on
// every workout start, so a new install or a renewed subscription is saved.
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!pushAvailable()) return false;
  // Called before any await: the question must come straight from the tap.
  const asking =
    Notification.permission === 'default'
      ? Notification.requestPermission()
      : Promise.resolve(Notification.permission);
  try {
    if ((await asking) !== 'granted' || !VAPID_PUBLIC_KEY) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
      }));
    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys.auth) return false;
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'user_id,endpoint' });
    return !error;
  } catch {
    return false;
  }
}

// Queues an alert for `date`; its id, or null if it couldn't be (not
// allowed, no signal). Never throws: the workout goes on.
export async function scheduleAt(date: Date, title: string, body: string): Promise<string | null> {
  if (!allowed()) return null;
  const id = randomUUID();
  try {
    const { error } = await supabase
      .from('scheduled_pushes')
      .insert({ id, send_at: date.toISOString(), title: title.slice(0, 100), body: body.slice(0, 200) });
    return error ? null : id;
  } catch {
    return null;
  }
}

export async function cancelScheduled(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await supabase.from('scheduled_pushes').delete().eq('id', id);
  } catch {
    // No signal: the alert may still come. Nothing more to do.
  }
}
