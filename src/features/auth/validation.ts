// Each error is also the last part of its translation key: auth.errors.<error>.
export type ValidationError = 'required' | 'invalidEmail';

export type SignInValues = { email: string; password: string };
export type SignInErrors = Partial<Record<keyof SignInValues, ValidationError>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationError | undefined {
  const trimmed = email.trim();
  if (trimmed === '') return 'required';
  if (!EMAIL_PATTERN.test(trimmed)) return 'invalidEmail';
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

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
