import type { StateStorage } from 'zustand/middleware';

// On the web: the browser's localStorage, written at once on every change
// like the phone's store. (expo-sqlite runs on the web only with
// cross-origin isolation headers, which would also block images and
// scripts from other sites.) Safari can refuse it, e.g. with storage turned
// off: then the state lives until the page reloads.
export const kvStorage: StateStorage = {
  getItem(name) {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Full or refused: nothing more to do.
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      // Refused: nothing to remove.
    }
  },
};
