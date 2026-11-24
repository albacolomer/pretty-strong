// SQLite's localStorage reads straight away (the language uses it too), so
// a setup left halfway is known before the first screen is drawn.
import 'expo-sqlite/localStorage/install';

import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SETUP_STEPS } from './setupFlow';

type Pending = {
  // The new account's, lowercased like Supabase keeps it.
  email: string;
  // Which of SETUP_STEPS is showing.
  step: number;
};

type SetupState = {
  pending: Pending | null;
  // Called just before the account is created, so the setup is already
  // waiting when the new session arrives.
  begin: (email: string) => void;
  goTo: (step: number) => void;
  // After "Som-hi", or when the account couldn't be created.
  finish: () => void;
};

// The setup after sign-up, kept on the phone (US-01). A sign-up always
// happens on one phone, so the profile needs no "set up" column: existing
// accounts never see it, and quitting halfway reopens the same step.
export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      pending: null,
      begin: (email) => set({ pending: { email: normalizeEmail(email), step: 0 } }),
      goTo: (step) =>
        set(({ pending }) => ({
          pending: pending
            ? { ...pending, step: Math.min(Math.max(step, 0), SETUP_STEPS.length - 1) }
            : null,
        })),
      finish: () => set({ pending: null }),
    }),
    {
      name: 'setup',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ pending }) => ({ pending }),
    },
  ),
);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// True while the signed-in account still has its setup to go through. Only
// the account that signed up: anyone else signing in on this phone goes
// straight to the app.
export function useNeedsSetup(session: Session | null): boolean {
  const email = useSetupStore((state) => state.pending?.email);
  const sessionEmail = session?.user.email;
  return !!email && !!sessionEmail && normalizeEmail(sessionEmail) === email;
}
