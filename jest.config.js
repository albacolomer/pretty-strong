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
  transform: {
    ...expoPreset.transform,
    [SCRIPTS]: [
      babelJest,
      { ...babelOptions, caller: { ...babelOptions.caller, supportsReactCompiler: true } },
    ],
  },
};
