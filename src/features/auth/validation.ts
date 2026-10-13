// Each error is also the last part of its translation key: auth.errors.<error>.
export type ValidationError = 'required' | 'invalidEmail' | 'invalidUsername' | 'passwordTooShort';

export type SignInValues = { email: string; password: string };
export type SignInErrors = Partial<Record<keyof SignInValues, ValidationError>>;

export type SignUpValues = { username: string; email: string; password: string };
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

export function validateSignUp({ username, email, password }: SignUpValues): SignUpErrors {
  const errors: SignUpErrors = {};
  const usernameError = validateUsername(username);
  if (usernameError) errors.username = usernameError;
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (password === '') errors.password = 'required';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = 'passwordTooShort';
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
