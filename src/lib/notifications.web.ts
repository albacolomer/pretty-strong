// The web has no local notifications: a browser can't schedule one for
// later, and iOS freezes the page in the background. The rest bar still
// counts down from the stored end time, so these do nothing and the
// workout goes on. (A rest alert on the web needs a push from Supabase:
// planned after the first deploy.)

export function setWorkoutScreenOpen(_open: boolean) {}

export function configureNotifications() {}

export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleAt(_date: Date, _title: string, _body: string): Promise<string | null> {
  return null;
}

export async function cancelScheduled(_id: string | null): Promise<void> {}
