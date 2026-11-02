import { renderHook } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import { colors } from '@/theme';

import { useActionSheet } from './useActionSheet';

describe('useActionSheet', () => {
  test('options in the accent, Cancel·la in grey, in the theme light or dark', async () => {
    const show = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation();
    const onPick = jest.fn();
    const { result } = await renderHook(() => useActionSheet());

    result.current({ title: 'Tren superior 1', options: ['Arxiva', 'Cancel·la'], cancelButtonIndex: 1 }, onPick);

    expect(show).toHaveBeenCalledWith(
      {
        title: 'Tren superior 1',
        options: ['Arxiva', 'Cancel·la'],
        cancelButtonIndex: 1,
        tintColor: colors.light.accent,
        cancelButtonTintColor: colors.light.textMuted,
        userInterfaceStyle: 'light',
      },
      onPick,
    );
    show.mockRestore();
  });
});
