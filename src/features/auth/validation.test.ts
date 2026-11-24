import {
  hasErrors,
  normalizeUsername,
  usernameCandidates,
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
  const valid = { email: 'alba@gmail.com', password: '12345678', confirmPassword: '12345678' };

  test('accepts valid values', () => {
    expect(validateSignUp(valid)).toEqual({});
  });

  test('flags every field when empty', () => {
    expect(validateSignUp({ email: '', password: '', confirmPassword: '' })).toEqual({
      email: 'required',
      password: 'required',
      confirmPassword: 'required',
    });
  });

  test('needs a password of at least 8 characters', () => {
    expect(validateSignUp({ ...valid, password: '1234567', confirmPassword: '1234567' })).toEqual({
      password: 'passwordTooShort',
    });
  });

  test('needs the same password twice', () => {
    expect(validateSignUp({ ...valid, confirmPassword: '12345679' })).toEqual({
      confirmPassword: 'passwordsDontMatch',
    });
  });
});

describe('usernameCandidates', () => {
  const digits = () => '4821';

  test("starts with the email's name, made to fit the rule", () => {
    expect(usernameCandidates(' Alba.Colomer@Gmail.com ', digits)[0]).toBe('albacolomer');
    expect(usernameCandidates('núria-p@gmail.com', digits)[0]).toBe('nuriap');
  });

  test('then the same with digits, still 20 characters at most', () => {
    expect(usernameCandidates('alba@gmail.com', digits)).toEqual([
      'alba',
      'alba4821',
      'alba4821',
      'alba4821',
      'alba4821',
    ]);
    const long = usernameCandidates('averyveryverylongemailname@gmail.com', digits);
    expect(long[0]).toBe('averyveryverylongema');
    expect(long[1]).toBe('averyveryverylon4821');
    expect(long.every((candidate) => candidate.length <= 20)).toBe(true);
  });

  test('skips a name too short for the rule', () => {
    expect(usernameCandidates('al@gmail.com', digits)[0]).toBe('al4821');
    expect(usernameCandidates('...@gmail.com', digits)[0]).toBe('user');
  });
});

describe('hasErrors', () => {
  test('is false for an empty object and true otherwise', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'required' })).toBe(true);
  });
});
