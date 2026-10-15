import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { Language } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { EquipmentIcon } from './EquipmentIcon';
import { exerciseName, type Exercise } from './exercise';
import { EXERCISE_IMAGES } from './exerciseImages';
import { MuscleFigure } from './MuscleFigure';

type ExerciseRowProps = {
  exercise: Exercise;
  language: Language;
  // Opens the exercise; without it the row is just information.
  onPress?: () => void;
  // In a picker: whether it's ticked. The row then acts as a checkbox.
  selected?: boolean;
  // Shown on the right, e.g. the ⋯ menu or a "Recupera" button.
  accessory?: ReactNode;
};

// Picture, name, then its main muscles and equipment, e.g. "Glutis · Barra".
// The accessory sits beside the tappable part, not inside it, so screen
// readers can reach both.
export function ExerciseRow({
  exercise,
  language,
  onPress,
  selected,
  accessory,
}: ExerciseRowProps) {
  const { t } = useTranslation();
  const details = [
    ...exercise.primaryMuscles.map((muscle) => t(`muscles.${muscle}`)),
    t(`equipment.${exercise.equipment}`),
  ].join(' · ');

  const content = (
    <>
      <ExercisePicture exercise={exercise} size={THUMBNAIL_SIZE} />
      <View style={styles.text}>
        <Text variant="bodyStrong">{exerciseName(exercise, language)}</Text>
        <Text variant="caption" color="textMuted">
          {details}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable
          role={selected === undefined ? 'button' : 'checkbox'}
          aria-checked={selected}
          onPress={onPress}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
          {content}
        </Pressable>
      ) : (
        <View style={styles.main}>{content}</View>
      )}
      {accessory}
    </View>
  );
}

const THUMBNAIL_SIZE = 56;

// The RepDB picture when there is one; otherwise (custom exercises, and the
// few built-ins RepDB doesn't have) the body figure with the main muscle,
// or the equipment icon for cardio saved without muscles.
// Decorative: the name is always written nearby.
export function ExercisePicture({ exercise, size }: { exercise: Exercise; size: number }) {
  const { colors } = useTheme();
  const source = exercise.slug ? EXERCISE_IMAGES[exercise.slug] : undefined;
  const muscle = exercise.primaryMuscles[0];
  const box = { width: size, height: size };

  if (source) {
    return <Image source={source} style={[styles.picture, box]} contentFit="cover" aria-hidden />;
  }
  return (
    <View
      style={[styles.picture, styles.fallback, box, { backgroundColor: colors.surfaceRaised }]}>
      {muscle ? (
        <MuscleFigure muscle={muscle} height={size * 0.93} />
      ) : (
        <EquipmentIcon equipment={exercise.equipment} color={colors.accent} size={size * 0.6} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  picture: {
    borderRadius: radius.input,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
