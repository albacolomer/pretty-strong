// Jest config. Starts from Expo's preset and changes one thing: tests are
// compiled with the React Compiler, like the app (app.json → reactCompiler),
// so caching bugs that only happen on the phone also fail the tests.
const expoPreset = require('jest-expo/jest-preset');

const SCRIPTS = '\\.[jt]sx?$';
const [babelJest, babelOptions] = expoPreset.transform[SCRIPTS];

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // userEvent types one character at a time, like a person; on a busy
  // laptop that can pass Jest's default 5 s.
  testTimeout: 15000,
  // Loads the web versions of Reanimated and Worklets (its engine), which
  // run in Jest; the native ones need the phone (Reanimated's Jest guide).
  resolver: 'react-native-reanimated/jest/resolver',
  // Phosphor's icons are imported one file at a time, straight from the
  // package's TypeScript source (components/ui/Icon), so Jest compiles
  // them like the app's own code.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace('|react-native|', '|react-native|phosphor-react-native|'),
  ),
  transform: {
    ...expoPreset.transform,
    [SCRIPTS]: [
      babelJest,
      { ...babelOptions, caller: { ...babelOptions.caller, supportsReactCompiler: true } },
    ],
  },
};
