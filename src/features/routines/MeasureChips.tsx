import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useActionSheet, Icon } from '@/components/ui';
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

// Over a cardio machine's or a carry's sets: "MESURES [Temps ✕] [Nivell ✕]
// [+]". Only these columns show. The ✕ takes one off; the last one left
// has a ▾ instead and swaps for another (Temps → Distància), since
// something has to be measured. + lists the rest in a menu.
export function MeasureChips({ trackingType, measures, exerciseName, onChange }: MeasureChipsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const toAdd = measuresToAdd(trackingType, measures);
  const only = measures.length === 1 ? measures[0] : null;
  const nameOf = (measure: Measure) => t(`routines.measures.names.${measure}`);

  // The others, in a menu; `pick` gets the one chosen.
  function choose(pick: (measure: Measure) => void) {
    showActionSheet(
      {
        title: t('routines.measures.pickTitle'),
        options: [...toAdd.map(nameOf), t('common.cancel')],
        cancelButtonIndex: toAdd.length,
      },
      (index) => {
        const measure = toAdd[index];
        if (measure) pick(measure);
      },
    );
  }

  // In the order they show.
  const ordered = (list: Measure[]) =>
    (MEASURE_CHOICES[trackingType]?.all ?? []).filter((measure) => list.includes(measure));

  return (
    <View style={styles.row}>
      <Text variant="label" color="textMuted" style={styles.title}>
        {t('routines.measures.title')}
      </Text>
      {measures.map((measure) =>
        measure === only ? (
          <Pressable
            key={measure}
            role="button"
            aria-label={t('routines.measures.changeFor', {
              measure: nameOf(measure),
              name: exerciseName,
            })}
            hitSlop={HIT_SLOP}
            disabled={toAdd.length === 0}
            onPress={() => choose((other) => onChange([other], measure))}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: colors.accentSoft },
              pressed && styles.pressed,
            ]}>
            <Text variant="captionMedium" color="accent">
              {nameOf(measure)}
            </Text>
            <Icon name="chevron.down" size={10} weight="semibold" tintColor={colors.accent} />
          </Pressable>
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
            <Icon name="xmark" size={10} weight="semibold" tintColor={colors.accent} />
          </Pressable>
        ),
      )}
      {toAdd.length > 0 ? (
        <Pressable
          role="button"
          aria-label={t('routines.measures.addFor', { name: exerciseName })}
          hitSlop={HIT_SLOP}
          onPress={() => choose((measure) => onChange(ordered([...measures, measure]), null))}
          style={({ pressed }) => [
            styles.chip,
            styles.add,
            { borderColor: colors.control },
            pressed && styles.pressed,
          ]}>
          <Icon name="plus" size={12} weight="semibold" tintColor={colors.textSecondary} />
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
