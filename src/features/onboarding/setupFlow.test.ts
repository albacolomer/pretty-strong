import {
  lengthLimits,
  readLength,
  readWeight,
  SETUP_QUESTIONS,
  setupProgress,
  weightLimits,
} from './setupFlow';
import { useSetupStore } from './setupStore';

describe('setupProgress', () => {
  test('fills a share per question, full on the last one', () => {
    expect(SETUP_QUESTIONS).toBe(6);
    expect(setupProgress(0)).toBeCloseTo(1 / 6);
    expect(setupProgress(5)).toBe(1);
    // "Tot a punt" stays full.
    expect(setupProgress(6)).toBe(1);
  });
});

describe('readWeight', () => {
  test('keeps kg as typed, with one decimal and either separator', () => {
    expect(readWeight('62,46', 'kg')).toEqual({ status: 'ok', value: 62.5 });
    expect(readWeight(' 70 ', 'kg')).toEqual({ status: 'ok', value: 70 });
  });

  test('turns lb into kg', () => {
    expect(readWeight('150', 'lb')).toEqual({ status: 'ok', value: 68 });
  });

  test('tells nothing typed from a weight the database refuses', () => {
    expect(readWeight('', 'kg')).toEqual({ status: 'empty' });
    expect(readWeight('abc', 'kg')).toEqual({ status: 'invalid' });
    expect(readWeight('15', 'kg')).toEqual({ status: 'invalid' });
    expect(readWeight('900', 'lb')).toEqual({ status: 'invalid' });
  });
});

describe('readLength', () => {
  test('turns inches into cm', () => {
    expect(readLength('30', 'in')).toEqual({ status: 'ok', value: 76.2 });
    expect(readLength('72', 'cm')).toEqual({ status: 'ok', value: 72 });
    expect(readLength('0', 'cm')).toEqual({ status: 'invalid' });
  });
});

describe('limits in your unit', () => {
  test('stay inside what the database takes', () => {
    expect(weightLimits('kg')).toEqual({ min: 20, max: 400 });
    expect(weightLimits('lb')).toEqual({ min: 45, max: 881 });
    expect(lengthLimits('in')).toEqual({ min: 1, max: 118 });
  });
});

describe('useSetupStore', () => {
  afterEach(() => useSetupStore.getState().finish());

  test('waits for the new account, lowercased, from the first step', () => {
    useSetupStore.getState().begin(' Alba@Gmail.com ');
    expect(useSetupStore.getState().pending).toEqual({ email: 'alba@gmail.com', step: 0 });
  });

  test('moves between steps without going past either end', () => {
    useSetupStore.getState().begin('alba@gmail.com');
    useSetupStore.getState().goTo(3);
    expect(useSetupStore.getState().pending?.step).toBe(3);
    useSetupStore.getState().goTo(-1);
    expect(useSetupStore.getState().pending?.step).toBe(0);
    useSetupStore.getState().goTo(99);
    expect(useSetupStore.getState().pending?.step).toBe(6);
  });

  test('is saved on the phone, so quitting halfway comes back to the same step', () => {
    useSetupStore.getState().begin('alba@gmail.com');
    useSetupStore.getState().goTo(2);
    expect(JSON.parse(localStorage.getItem('setup') ?? '{}').state.pending).toEqual({
      email: 'alba@gmail.com',
      step: 2,
    });
  });
});
