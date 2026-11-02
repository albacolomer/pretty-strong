import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text, useActionSheet } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { ROUTINE_LABELS, type RoutineLabel } from './routine';

type RoutineTypeButtonProps = {
  value: RoutineLabel;
  onChange: (label: RoutineLabel) => void;
};

// "Força ▾" next to the routine's name: opens the native list of types.
export function RoutineTypeButton({ value, onChange }: RoutineTypeButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const name = t(`routines.labels.${value}`);

  function choose() {
    showActionSheet(
      {
        title: t('routines.editor.label'),
        options: [...ROUTINE_LABELS.map((label) => t(`routines.labels.${label}`)), t('common.cancel')],
        cancelButtonIndex: ROUTINE_LABELS.length,
      },
      (index) => {
        const label = ROUTINE_LABELS[index];
        if (label && label !== value) onChange(label);
      },
    );
  }

  return (
    <Pressable
      role="button"
      aria-label={t('routines.editor.typeButton', { type: name })}
      onPress={choose}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.accentSoft },
        pressed && styles.pressed,
      ]}>
      <Text variant="bodyStrong" color="accent" numberOfLines={1}>
        {name} ▾
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
