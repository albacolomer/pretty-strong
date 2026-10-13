import { hasErrors, validateEmail, validateSignIn } from './validation';

describe('validateEmail', () => {
  test.each([
    ['', 'required'],
    ['   ', 'required'],
    ['alba', 'invalidEmail'],
    ['alba@', 'invalidEmail'],
    ['alba@gmail', 'invalidEmail'],
    ['alba @gmail.com', 'invalidEmail'],
  ])('%j → %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });

  test('accepts a normal address, ignoring surrounding spaces', () => {
    expect(validateEmail('  alba@gmail.com ')).toBeUndefined();
  });
});

describe('validateSignIn', () => {
  test('flags both fields when empty', () => {
    expect(validateSignIn({ email: '', password: '' })).toEqual({
      email: 'required',
      password: 'required',
    });
  });

  test('accepts any non-empty password', () => {
    expect(validateSignIn({ email: 'alba@gmail.com', password: 'x' })).toEqual({});
  });
});

describe('hasErrors', () => {
  test('is false for an empty object and true otherwise', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'required' })).toBe(true);
  });
});
