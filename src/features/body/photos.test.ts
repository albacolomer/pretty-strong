import { base64ToBytes, defaultComparison, exifDate, photoPath } from './photos';

describe('photos', () => {
  test('a picture goes in your own folder', () => {
    expect(photoPath('user-1', 'progress', 'abc')).toBe('user-1/progress/abc.jpg');
    expect(photoPath('user-1', 'avatar', 'def')).toBe('user-1/avatar/def.jpg');
  });

  test('the day it was taken, wherever iOS puts it', () => {
    expect(exifDate({ DateTimeOriginal: '2026:10:02 08:30:12' })).toBe('2026-10-02');
    expect(exifDate({ '{Exif}': { DateTimeOriginal: '2026:09:02 19:01:00' } })).toBe('2026-09-02');
    expect(exifDate({ '{TIFF}': { DateTime: '2026:08:15 10:00:00' } })).toBe('2026-08-15');
    expect(exifDate({ Make: 'Apple' })).toBeNull();
    expect(exifDate(null)).toBeNull();
  });

  test('base64 to bytes', () => {
    expect([...base64ToBytes('SGk=')]).toEqual([72, 105]);
  });

  test('compare the oldest with the newest', () => {
    const photo = (id: string, date: string) => ({ id, date, storagePath: `u/progress/${id}.jpg` });
    expect(
      defaultComparison([photo('b', '2026-10-02'), photo('a', '2026-08-01'), photo('c', '2026-09-01')]),
    ).toEqual(['a', 'b']);
    expect(defaultComparison([photo('a', '2026-08-01')])).toBeNull();
  });
});
