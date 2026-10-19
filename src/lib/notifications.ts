import * as Notifications from 'expo-notifications';

// Local notifications only (no server push), for "rest is over" (US-18).

// Whether the workout screen is open: its rest bar and a vibration already
// say rest is over, so the notification only shows elsewhere (another tab,
// another app, or the phone locked, where iOS shows it anyway).
let workoutScreenOpen = false;

export function setWorkoutScreenOpen(open: boolean) {
  workoutScreenOpen = open;
}

// Once, when the app starts: what a notification does while the app is open.
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: !workoutScreenOpen,
      shouldShowList: !workoutScreenOpen,
      shouldPlaySound: !workoutScreenOpen,
      shouldSetBadge: false,
    }),
  });
}

// Asks once (iOS won't ask again after a "no"). True when allowed.
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// A notification at `date`; its id, or null if it couldn't be scheduled
// (e.g. notifications not allowed). Never throws: the workout goes on.
export async function scheduleAt(date: Date, title: string, body: string): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduled(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already shown, or gone: nothing to cancel.
  }
}
