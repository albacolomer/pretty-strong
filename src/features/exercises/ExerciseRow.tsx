import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

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
  // Shown on the right, e.g. the ⋯ menu or a "Recupera" button.
  accessory?: ReactNode;
};

// Picture, name, then its main muscles and equipment, e.g. "Glutis · Barra".
export function ExerciseRow({ exercise, language, accessory }: ExerciseRowProps) {
  const { t } = useTranslation();
  const details = [
    ...exercise.primaryMuscles.map((muscle) => t(`muscles.${muscle}`)),
    t(`equipment.${exercise.equipment}`),
  ].join(' · ');

  return (
    <View style={styles.row}>
      <ExerciseThumbnail exercise={exercise} />
      <View style={styles.text}>
        <Text variant="bodyStrong">{exerciseName(exercise, language)}</Text>
        <Text variant="caption" color="textMuted">
          {details}
        </Text>
      </View>
      {accessory}
    </View>
  );
}

const THUMBNAIL_SIZE = 56;

// The RepDB picture when there is one; otherwise (custom exercises, and the
// few built-ins RepDB doesn't have) the body figure with the main muscle,
// or the equipment icon for cardio saved without muscles.
// Decorative: the name is written next to it.
function ExerciseThumbnail({ exercise }: { exercise: Exercise }) {
  const { colors } = useTheme();
  const source = exercise.slug ? EXERCISE_IMAGES[exercise.slug] : undefined;
  const muscle = exercise.primaryMuscles[0];

  if (source) {
    return <Image source={source} style={styles.thumbnail} contentFit="cover" aria-hidden />;
  }
  return (
    <View style={[styles.thumbnail, styles.fallback, { backgroundColor: colors.surfaceRaised }]}>
      {muscle ? (
        <MuscleFigure muscle={muscle} height={52} />
      ) : (
        <EquipmentIcon equipment={exercise.equipment} color={colors.accent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
