// On the web there's no Face ID, so hidden photos ask for the account's
// password instead (lib/deviceAuth.web.ts). The sheet that asks lives once
// at the root (PasswordCheckHost); this hands it the question and waits.

export type PasswordQuestion = {
  title: string;
  cancelLabel: string;
  // True once the password is right; false when cancelled.
  answer: (ok: boolean) => void;
};

let host: ((question: PasswordQuestion) => void) | null = null;

// The sheet registers itself; the returned function unregisters it.
export function setPasswordCheckHost(open: (question: PasswordQuestion) => void): () => void {
  host = open;
  return () => {
    if (host === open) host = null;
  };
}

// Resolves true once the right password is typed; false when cancelled,
// or when there is no sheet to ask with.
export function askForPassword(title: string, cancelLabel: string): Promise<boolean> {
  const open = host;
  if (!open) return Promise.resolve(false);
  return new Promise((resolve) => open({ title, cancelLabel, answer: resolve }));
}
