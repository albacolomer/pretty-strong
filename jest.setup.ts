// Runs before every test file.

// Tests render screens without the app's root, so there is no safe-area
// provider; the library's own mock reports zero insets instead.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// expo-sqlite's localStorage needs the phone's native SQLite, which Jest
// doesn't have. Skip installing it and use an in-memory one instead.
jest.mock('expo-sqlite/localStorage/install', () => ({}));

const store = new Map<string, string>();

globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
  key: (index) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};
