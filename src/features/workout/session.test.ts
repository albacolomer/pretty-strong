import { feelingFromEnergy, feelingMood } from './session';

describe('how it felt', () => {
  test('each word covers two steps, and 10 has its own', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(feelingMood)).toEqual([
      'awful',
      'awful',
      'bad',
      'bad',
      'okay',
      'okay',
      'good',
      'good',
      'great',
      'great',
      'amazing',
    ]);
  });

  test('old energy 1 to 5 becomes 2 to 10', () => {
    expect([1, 2, 3, 4, 5].map(feelingFromEnergy)).toEqual([2, 4, 6, 8, 10]);
  });
});
