import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, SettingsRow, Stepper } from '@/components/ui';
import { spacing } from '@/theme';

import {
  DEFAULT_PLANNED_DURATION_S,
  formatDuration,
  PLANNED_DURATION_MAX_S,
  PLANNED_DURATION_MIN_S,
  PLANNED_DURATION_STEP_S,
} from './routine';

type PlannedDurationFieldProps = {
  // Null: no planned duration.
  value: number | null;
  onChange: (seconds: number | null) => void;
};

// How long a class or session is planned to last, 5 minutes at a time: a
// row of the routine's settings. Optional: tapping the row adds it at
// 1 hour, and it can be taken off again.
export function PlannedDurationField({ value, onChange }: PlannedDurationFieldProps) {
  const { t } = useTranslation();

  if (value === null) {
    return (
      <SettingsRow
        icon="clock"
        label={t('routines.editor.duration')}
        optional
        onPress={() => onChange(DEFAULT_PLANNED_DURATION_S)}
        aria-label={t('routines.editor.addDuration')}
      />
    );
  }

  return (
    <SettingsRow icon="clock" label={t('routines.editor.duration')}>
      <View style={styles.row}>
        <Stepper
          value={formatDuration(value)}
          valueLabel={t('routines.editor.durationValue', { time: formatDuration(value) })}
          onDecrement={() => onChange(value - PLANNED_DURATION_STEP_S)}
          onIncrement={() => onChange(value + PLANNED_DURATION_STEP_S)}
          decrementLabel={t('routines.editor.durationMinus')}
          incrementLabel={t('routines.editor.durationPlus')}
          canDecrement={value > PLANNED_DURATION_MIN_S}
          canIncrement={value < PLANNED_DURATION_MAX_S}
        />
        <Button
          label={t('routines.editor.noDuration')}
          variant="ghost"
          onPress={() => onChange(null)}
        />
      </View>
    </SettingsRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
