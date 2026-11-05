import { randomUUID } from 'expo-crypto';

import { supabase } from '@/lib/supabase';

import { base64ToBytes, photoPath, type PhotoKind, type ProgressPhoto } from './photos';

const BUCKET = 'photos';
// How long a link to a private picture works; links are fetched again
// before then.
export const SIGNED_URL_SECONDS = 60 * 60;

export async function uploadPhoto(
  userId: string,
  kind: PhotoKind,
  base64: string,
): Promise<string> {
  const path = photoPath(userId, kind, randomUUID());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(base64).buffer as ArrayBuffer, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// Links to show private pictures, by path.
export async function fetchSignedUrls(paths: readonly string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_SECONDS);
  if (error) throw error;
  return Object.fromEntries(
    data.flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])),
  );
}

// Newest first. RLS only returns your own.
export async function fetchProgressPhotos(): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('id, date, storage_path')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({ id: row.id, date: row.date, storagePath: row.storage_path }));
}

// Uploads the picture, then records it; if recording fails, the picture
// goes too, so nothing is left behind.
export async function addProgressPhoto(userId: string, date: string, base64: string): Promise<void> {
  const path = await uploadPhoto(userId, 'progress', base64);
  const { error } = await supabase.from('progress_photos').insert({ date, storage_path: path });
  if (error) {
    await removePhoto(path).catch(() => {});
    throw error;
  }
}

export async function deleteProgressPhoto(photo: ProgressPhoto): Promise<void> {
  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
  if (error) throw error;
  await removePhoto(photo.storagePath);
}

// A new profile picture replaces the old one; null takes it away.
export async function setAvatar(
  userId: string,
  base64: string | null,
  oldPath: string | null,
): Promise<void> {
  const path = base64 === null ? null : await uploadPhoto(userId, 'avatar', base64);
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId);
  if (error) {
    if (path) await removePhoto(path).catch(() => {});
    throw error;
  }
  if (oldPath) await removePhoto(oldPath).catch(() => {});
}
