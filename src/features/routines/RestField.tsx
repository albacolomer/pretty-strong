import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { KeyboardDoneBar, StepButton, Text } from '@/components/ui';
import {
  adjustRest,
  formatRest,
  readTypedRest,
  REST_MAX_S,
  REST_STEP_S,
} from '@/features/exercises/rest';
import { radius, spacing, touch, typography, useTheme } from '@/theme';

type RestFieldProps = {
  // Shown before it, e.g. "Descans".
  label: string;
  // Null: follows the exercise's own rest, shown in grey.
  value: number | null;
  // The exercise's own rest, shown while value is null.
  defaultS: number;
  onChange: (seconds: number) => void;
  // What screen readers say for the time, e.g. "Descans: 1:30".
  valueLabel: (time: string) => string;
};

// "Descans ⊖ 1:30 ⊕" on one short line: small −/+ for 15-second steps, or
// tap the time and type it (1, 3, 0 → 1:30).
export function RestField({ label, value, defaultS, onChange, valueLabel }: RestFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const accessoryId = useId();
  const rest = value ?? defaultS;
  // What's shown while typing; null when not typing.
  const [typed, setTyped] = useState<string | null>(null);
  const shown = typed ?? formatRest(rest);

  return (
    <View style={styles.row}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <StepButton
        small
        symbol="−"
        label={t('routines.editor.restMinus')}
        onPress={() => onChange(adjustRest(rest, -REST_STEP_S))}
        disabled={rest <= 0}
      />
      <TextInput
        aria-label={valueLabel(shown)}
        value={shown}
        keyboardType="number-pad"
        inputAccessoryViewID={accessoryId}
        selectTextOnFocus
        selectionColor={colors.accent}
        onFocus={() => setTyped(formatRest(rest))}
        onChangeText={(text) => {
          const { display, seconds } = readTypedRest(text);
          setTyped(display);
          onChange(seconds);
        }}
        onBlur={() => setTyped(null)}
        style={[
          styles.time,
          {
            backgroundColor: colors.surfaceRaised,
            // Grey while it follows the exercise's own rest.
            color: value === null && typed === null ? colors.textMuted : colors.text,
          },
        ]}
      />
      <StepButton
        small
        symbol="+"
        label={t('routines.editor.restPlus')}
        onPress={() => onChange(adjustRest(rest, REST_STEP_S))}
        disabled={rest >= REST_MAX_S}
      />
      <KeyboardDoneBar nativeID={accessoryId} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    minWidth: 64,
    minHeight: touch.min,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    textAlign: 'center',
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: typography.bodyStrong.fontSize,
    fontVariant: ['tabular-nums'],
  },
});
