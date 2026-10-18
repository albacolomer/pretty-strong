import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Stepper, Text } from '@/components/ui';
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

// How long a class or session is planned to last, 5 minutes at a time.
// Optional: it can be taken off, and added back at 1 hour.
export function PlannedDurationField({ value, onChange }: PlannedDurationFieldProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.field}>
      <Text variant="caption" color="textMuted">
        {t('routines.editor.duration')}
      </Text>
      {value === null ? (
        <Button
          label={t('routines.editor.addDuration')}
          variant="secondary"
          onPress={() => onChange(DEFAULT_PLANNED_DURATION_S)}
        />
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
