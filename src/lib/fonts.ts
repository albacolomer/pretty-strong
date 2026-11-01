import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold_Italic } from '@expo-google-fonts/barlow-condensed/700Bold_Italic';
import { InterTight_400Regular } from '@expo-google-fonts/inter-tight/400Regular';
import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { useFonts } from 'expo-font';

import { fonts } from '@/theme';

// The faces the design uses, imported one by one so the app only bundles
// these six (each package has 18).
const FONT_FILES = {
  [fonts.regular]: InterTight_400Regular,
  [fonts.medium]: InterTight_500Medium,
  [fonts.semiBold]: InterTight_600SemiBold,
  [fonts.bold]: InterTight_700Bold,
  [fonts.condensed]: BarlowCondensed_600SemiBold,
  [fonts.condensedItalic]: BarlowCondensed_700Bold_Italic,
};

// Loads the app's fonts as it starts. Expo Go can't use expo-font's
// build-time plugin (that needs a development build), so they load here.
// True once they're ready, or once they've failed: then the app goes on
// in the system font rather than staying on the splash screen.
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || error !== null;
}
