import { ActionSheetIOS, type ActionSheetIOSOptions } from 'react-native';

import { useTheme } from '@/theme';

// The native iOS menu (action sheet) in the app's colours: its options in
// the accent, "Cancel·la" in grey (a step back, not an action), light or
// dark like the iPhone. A destructive option (destructiveButtonIndex)
// stays red.
export function useActionSheet() {
  const { colors, scheme } = useTheme();

  return (options: ActionSheetIOSOptions, onPick: (index: number) => void) =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        tintColor: colors.accent,
        cancelButtonTintColor: colors.textMuted,
        userInterfaceStyle: scheme,
        ...options,
      },
      onPick,
    );
}
