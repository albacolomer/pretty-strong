import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { ENERGY_LEVELS, type Energy } from './session';

// "Com vas d'energia?" 1 to 5 (US-21), in the finish summary and when
// editing a past workout. Optional: tapping the chosen one again clears it.
export function EnergyPicker({
  value,
  onChange,
}: {
  value: Energy | null;
  onChange: (energy: Energy | null) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text variant="bodyStrong">{t('workout.summary.energy')}</Text>
      <View role="radiogroup" aria-label={t('workout.summary.energy')} style={styles.row}>
        {ENERGY_LEVELS.map((level) => {
          const selected = level === value;
          return (
            <Pressable
              key={level}
              role="radio"
              aria-checked={selected}
              aria-label={t('workout.summary.energyLevel', { level })}
              onPress={() => onChange(selected ? null : level)}
              style={({ pressed }) => [
                styles.level,
                { backgroundColor: selected ? colors.accent : colors.surfaceRaised },
                pressed && styles.pressed,
              ]}>
              <Text variant="bodyStrong" color={selected ? 'onAccent' : 'text'}>
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.ends} aria-hidden>
        <Text variant="caption" color="textMuted">
          {t('workout.summary.energyLow')}
        </Text>
        <Text variant="caption" color="textMuted">
          {t('workout.summary.energyHigh')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  level: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.75,
  },
});
