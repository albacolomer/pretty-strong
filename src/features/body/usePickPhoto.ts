import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  type ImagePickerOptions,
} from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS } from 'react-native';

import { useToast } from '@/components/ui';
import { useTheme } from '@/theme';

import { exifDate } from './photos';

export type PickedPhoto = {
  // The JPEG, ready to upload.
  base64: string;
  // When it was taken, if the photo says (one from the library).
  date: string | null;
};

type PickOptions = {
  title: string;
  // A square crop, for the profile picture.
  square?: boolean;
  // One more choice at the end, e.g. "Treu la foto".
  remove?: { label: string; run: () => void };
};

// "Fes una foto" or "Tria'n una de la galeria", then the iOS camera or
// photo picker. Resolves with the photo, or null if none was picked.
// Camera access is asked the first time; the library needs no permission.
export function usePickPhoto(): (options: PickOptions) => Promise<PickedPhoto | null> {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const showToast = useToast();

  return ({ title, square = false, remove }) =>
    new Promise((resolve) => {
      const options = [
        t('photos.takePhoto'),
        t('photos.fromLibrary'),
        ...(remove ? [remove.label] : []),
        t('common.cancel'),
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options,
          destructiveButtonIndex: remove ? 2 : undefined,
          cancelButtonIndex: options.length - 1,
          userInterfaceStyle: scheme,
        },
        (index) => {
          if (index === 0 || index === 1) {
            pick(index === 0 ? 'camera' : 'library', square).then(resolve, () => resolve(null));
            return;
          }
          if (remove && index === 2) remove.run();
          resolve(null);
        },
      );
    });

  async function pick(source: 'camera' | 'library', square: boolean): Promise<PickedPhoto | null> {
    const settings: ImagePickerOptions = {
      mediaTypes: ['images'],
      // Smaller files, still sharp on the phone.
      quality: 0.6,
      base64: true,
      exif: source === 'library',
      allowsEditing: square,
      aspect: square ? [1, 1] : undefined,
    };
    if (source === 'camera') {
      const permission = await requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast({ message: t('photos.cameraDenied') });
        return null;
      }
    }
    const result =
      source === 'camera' ? await launchCameraAsync(settings) : await launchImageLibraryAsync(settings);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return null;
    return { base64: asset.base64, date: exifDate(asset.exif) };
  }
}
