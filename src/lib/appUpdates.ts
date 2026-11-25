export type AppUpdateOptions = {
  // True while reloading would get in the way (a workout is going).
  isBusy: () => boolean;
};

// The phone's app updates through the App Store or EAS Update, not here.
// The web's version (appUpdates.web.ts) saves the app for offline use and
// switches to a new deploy at a good moment.
export function useAppUpdates(_options: AppUpdateOptions) {}
