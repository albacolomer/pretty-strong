// Progress photos and the profile picture (US-28). No React here.

export type ProgressPhoto = { id: string; date: string; storagePath: string };

export type PhotoKind = 'progress' | 'avatar';

// Where a picture goes in the private photos bucket: always inside your
// own folder, which is all the bucket's policies let you touch.
export function photoPath(userId: string, kind: PhotoKind, id: string): string {
  return `${userId}/${kind}/${id}.jpg`;
}

// The day a photo was taken, from its EXIF data ("2026:10:02 08:30:12"),
// as iOS gives it: at the top, or under {Exif} or {TIFF}. Null if unknown.
export function exifDate(exif: Record<string, unknown> | null | undefined): string | null {
  if (!exif) return null;
  const nested = (group: string, key: string) => {
    const value = exif[group];
    return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
  };
  const raw =
    exif.DateTimeOriginal ?? nested('{Exif}', 'DateTimeOriginal') ?? nested('{TIFF}', 'DateTime');
  if (typeof raw !== 'string') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

// The picker's base64 JPEG as bytes, to upload.
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// The two to compare at first: the oldest and the newest.
export function defaultComparison(photos: readonly ProgressPhoto[]): [string, string] | null {
  if (photos.length < 2) return null;
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  return [sorted[0].id, sorted.at(-1)!.id];
}
