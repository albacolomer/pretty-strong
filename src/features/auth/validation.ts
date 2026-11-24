// Each error is also the last part of its translation key: auth.errors.<error>.
export type ValidationError =
  | 'required'
  | 'invalidEmail'
  | 'invalidUsername'
  | 'passwordTooShort'
  | 'passwordsDontMatch';

export type SignInValues = { email: string; password: string };
export type SignInErrors = Partial<Record<keyof SignInValues, ValidationError>>;

// The username is made from the email, and changed in the setup after.
export type SignUpValues = { email: string; password: string; confirmPassword: string };
export type SignUpErrors = Partial<Record<keyof SignUpValues, ValidationError>>;

export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same rule as the profiles_username_format check in the database.
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Usernames are stored in lowercase, so "Alba" and "alba" are the same name.
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateEmail(email: string): ValidationError | undefined {
  const trimmed = email.trim();
  if (trimmed === '') return 'required';
  if (!EMAIL_PATTERN.test(trimmed)) return 'invalidEmail';
  return undefined;
}

export function validateUsername(username: string): ValidationError | undefined {
  const normalized = normalizeUsername(username);
  if (normalized === '') return 'required';
  if (!USERNAME_PATTERN.test(normalized)) return 'invalidUsername';
  return undefined;
}

// Sign-in only checks that a password was typed, so older passwords that
// don't meet today's sign-up rules still work.
export function validateSignIn({ email, password }: SignInValues): SignInErrors {
  const errors: SignInErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (password === '') errors.password = 'required';
  return errors;
}

export function validateSignUp({ email, password, confirmPassword }: SignUpValues): SignUpErrors {
  const errors: SignUpErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (password === '') errors.password = 'required';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = 'passwordTooShort';
  // The same password twice, so a typo can't lock you out.
  if (confirmPassword === '') errors.confirmPassword = 'required';
  else if (confirmPassword !== password) errors.confirmPassword = 'passwordsDontMatch';
  return errors;
}

// Usernames to try for a new account, best first: the email's name, made
// to fit the username rule ("Alba.Colomer@…" → "albacolomer"), then the
// same with four digits in case it's taken. `digits` gives "4821".
export function usernameCandidates(
  email: string,
  digits: () => string = () => String(1000 + Math.floor(Math.random() * 9000)),
): string[] {
  const name = (email.trim().toLowerCase().split('@')[0] ?? '')
    .normalize('NFD')
    // The accents split off by NFD ("è" → "e" + "`").
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/g, '');
  const base = name === '' ? 'user' : name.slice(0, 20);
  const numbered = Array.from({ length: 4 }, () => `${base.slice(0, 16)}${digits()}`);
  return [base, ...numbered].filter((candidate) => USERNAME_PATTERN.test(candidate));
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
