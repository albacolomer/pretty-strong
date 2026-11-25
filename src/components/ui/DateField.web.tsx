import type { ChangeEvent, CSSProperties, MouseEvent } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import type { DateFieldProps } from './DateField';
import { Text } from './Text';

export type { DateFieldProps } from './DateField';

// "2026-11-25", the browser's own format for a day.
function toInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// The web's compact date picker: the same pill as the phone's, with the
// browser's own date input laid invisibly over it. Tapping it opens the
// iPhone's date picker in Safari, and a calendar on a computer.
export function DateField({ value, onChange, label, minimumDate, maximumDate }: DateFieldProps) {
  const { colors } = useTheme();
  const language = useAppLanguage();
  const shown = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);

  function change(event: ChangeEvent<HTMLInputElement>) {
    // Empty when the picker's "Reset" is used: keep the day there was.
    if (event.target.value) onChange(fromInputValue(event.target.value));
  }

  function open(event: MouseEvent<HTMLInputElement>) {
    // A computer's browser opens its calendar only from its own icon,
    // which is hidden here; showPicker opens it from anywhere.
    try {
      event.currentTarget.showPicker();
    } catch {
      // Not supported, or already open: the input opens itself.
    }
  }

  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceRaised }]}>
      <Text color="accent">{shown}</Text>
      <input
        type="date"
        aria-label={label}
        value={toInputValue(value)}
        min={minimumDate ? toInputValue(minimumDate) : undefined}
        max={maximumDate ? toInputValue(maximumDate) : undefined}
        onChange={change}
        onClick={open}
        style={invisibleInput}
      />
    </View>
  );
}

// Over the whole pill, so a tap anywhere on it opens the picker. 16 px, or
// Safari zooms the page in when it's tapped.
const invisibleInput: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  fontSize: 16,
  border: 'none',
  margin: 0,
  padding: 0,
  cursor: 'pointer',
};

const styles = StyleSheet.create({
  pill: {
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.small * 2,
  },
});
