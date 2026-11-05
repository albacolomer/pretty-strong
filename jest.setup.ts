// Runs before every test file.

// Tests render screens without the app's root, so there is no safe-area
// provider; the library's own mock reports zero insets instead.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Reanimated and Gesture Handler run on the phone's UI thread, which Jest
// doesn't have. Both ship official stand-ins for tests.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
require('react-native-gesture-handler/jestSetup');
// Gesture Handler 3 hooks into Worklets' UI thread as it starts; Jest runs
// Worklets' web version, which has none, so use Gesture Handler's web hook
// too (it does nothing). Both copies, as its own jestSetup does.
jest.mock('react-native-gesture-handler/src/handlers/gestures/installUIRuntimeBindings', () =>
  jest.requireActual('react-native-gesture-handler/src/handlers/gestures/installUIRuntimeBindings.web'),
);
jest.mock('react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings', () =>
  jest.requireActual(
    'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings.web',
  ),
);

// A bar above the keyboard only shows while the keyboard is open, and tests
// have no keyboard: render nothing, or every number field's "Fet" would show.
jest.mock('react-native/Libraries/Components/TextInput/InputAccessoryView', () => ({
  __esModule: true,
  default: () => null,
}));

// expo-sqlite's localStorage needs the phone's native SQLite, which Jest
// doesn't have. Skip installing it and use an in-memory one instead.
jest.mock('expo-sqlite/localStorage/install', () => ({}));

// The same for expo-sqlite's key-value store (the live workout): an
// in-memory one, kept apart from the localStorage below.
jest.mock('expo-sqlite/kv-store', () => {
  const items = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => items.get(key) ?? null,
    setItem: async (key: string, value: string) => void items.set(key, value),
    removeItem: async (key: string) => void items.delete(key),
  };
  return { __esModule: true, default: storage, Storage: storage };
});

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

// Tests never reach the database: each feature's api module is mocked
// where it's used. The client itself is a stand-in too, so a component
// that only imports it on the way (an exercise's photo, through its
// signed link) needs no real .env. A test can still mock it its own way.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
