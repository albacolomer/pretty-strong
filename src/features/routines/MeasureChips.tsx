import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useActionSheet } from '@/components/ui';
import type { TrackingType } from '@/features/exercises/vocabulary';
import { radius, spacing, touch, useTheme } from '@/theme';

import { MEASURE_CHOICES, measuresToAdd, type Measure } from './targets';

const CHIP_HEIGHT = 32;
// Each chip's tap area grows to a full touch.
const HIT_SLOP = (touch.min - CHIP_HEIGHT) / 2;

type MeasureChipsProps = {
  trackingType: TrackingType;
  // What it measures now, in order.
  measures: readonly Measure[];
  exerciseName: string;
  onChange: (measures: Measure[], removed: Measure | null) => void;
};

// Over a cardio machine's or a carry's sets: "MESURES [Temps] [Nivell ✕]
// [+]". Only these columns show. The ✕ takes one off (not the one that
// always stays, e.g. Temps); + lists the rest in a menu.
export function MeasureChips({ trackingType, measures, exerciseName, onChange }: MeasureChipsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const fixed = MEASURE_CHOICES[trackingType]?.fixed;
  const toAdd = measuresToAdd(trackingType, measures);
  const nameOf = (measure: Measure) => t(`routines.measures.names.${measure}`);

  function add() {
    showActionSheet(
      {
        title: t('routines.measures.pickTitle'),
        options: [...toAdd.map(nameOf), t('common.cancel')],
        cancelButtonIndex: toAdd.length,
      },
      (index) => {
        const measure = toAdd[index];
        if (measure) onChange([...measures, measure], null);
      },
    );
  }

  return (
    <View style={styles.row}>
      <Text variant="label" color="textMuted" style={styles.title}>
        {t('routines.measures.title')}
      </Text>
      {measures.map((measure) =>
        measure === fixed ? (
          <View key={measure} style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
            <Text variant="captionMedium" color="accent">
              {nameOf(measure)}
            </Text>
          </View>
        ) : (
          <Pressable
            key={measure}
            role="button"
            aria-label={t('routines.measures.removeFor', {
              measure: nameOf(measure),
              name: exerciseName,
            })}
            hitSlop={HIT_SLOP}
            onPress={() =>
              onChange(
                measures.filter((other) => other !== measure),
                measure,
              )
            }
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: colors.accentSoft },
              pressed && styles.pressed,
            ]}>
            <Text variant="captionMedium" color="accent">
              {nameOf(measure)}
            </Text>
            <SymbolView name="xmark" size={10} weight="semibold" tintColor={colors.accent} />
          </Pressable>
        ),
      )}
      {toAdd.length > 0 ? (
        <Pressable
          role="button"
          aria-label={t('routines.measures.addFor', { name: exerciseName })}
          hitSlop={HIT_SLOP}
          onPress={add}
          style={({ pressed }) => [
            styles.chip,
            styles.add,
            { borderColor: colors.control },
            pressed && styles.pressed,
          ]}>
          <SymbolView name="plus" size={12} weight="semibold" tintColor={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    marginRight: spacing.xs,
  },
  chip: {
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  // Just a + in an outline: the same size as a chip, but empty.
  add: {
    width: CHIP_HEIGHT + spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  pressed: {
    opacity: 0.75,
  },
});
