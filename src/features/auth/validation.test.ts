import {
  hasErrors,
  normalizeUsername,
  validateEmail,
  validateSignIn,
  validateSignUp,
  validateUsername,
} from './validation';

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

describe('normalizeUsername', () => {
  test('trims and lowercases', () => {
    expect(normalizeUsername('  Alba_Strong ')).toBe('alba_strong');
  });
});

describe('validateUsername', () => {
  test.each([
    ['', 'required'],
    ['  ', 'required'],
    ['al', 'invalidUsername'],
    ['a'.repeat(21), 'invalidUsername'],
    ['alba colomer', 'invalidUsername'],
    ['alba.c', 'invalidUsername'],
    ['àlba', 'invalidUsername'],
  ])('%j → %s', (username, expected) => {
    expect(validateUsername(username)).toBe(expected);
  });

  test.each(['alb', 'a'.repeat(20), 'alba_99', 'Alba'])('accepts %j', (username) => {
    expect(validateUsername(username)).toBeUndefined();
  });
});

describe('validateSignUp', () => {
  const valid = { username: 'alba', email: 'alba@gmail.com', password: '12345678' };

  test('accepts valid values', () => {
    expect(validateSignUp(valid)).toEqual({});
  });

  test('flags every field when empty', () => {
    expect(validateSignUp({ username: '', email: '', password: '' })).toEqual({
      username: 'required',
      email: 'required',
      password: 'required',
    });
  });

  test('needs a password of at least 8 characters', () => {
    expect(validateSignUp({ ...valid, password: '1234567' })).toEqual({
      password: 'passwordTooShort',
    });
  });
});

describe('hasErrors', () => {
  test('is false for an empty object and true otherwise', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'required' })).toBe(true);
  });
});
