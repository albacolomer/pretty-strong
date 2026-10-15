import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Stepper, Text } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { adjustRest, formatRest, REST_MAX_S, REST_STEP_S } from '@/features/exercises/rest';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { PLANNED_SETS_MAX, PLANNED_SETS_MIN } from './routine';
import type { DraftExercise } from './routineDraft';

type RoutineExerciseCardProps = {
  item: DraftExercise;
  exercise: Exercise | undefined;
  // The exercise's own default rest (yours from its detail screen, or the
  // app's), used while this routine doesn't set one.
  exerciseRestS: number;
  isFirst: boolean;
  isLast: boolean;
  onSetsChange: (sets: number) => void;
  onRestChange: (restS: number | null) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

// One exercise in the routine editor: planned sets, rest, and a ⋯ menu to
// move or remove it (every action in a menu, gym UX rule 8).
export function RoutineExerciseCard({
  item,
  exercise,
  exerciseRestS,
  isFirst,
  isLast,
  onSetsChange,
  onRestChange,
  onMove,
  onRemove,
}: RoutineExerciseCardProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const name = exercise ? exerciseName(exercise, language) : '…';
  const rest = item.restS ?? exerciseRestS;

  function openMenu() {
    const actions = [
      ...(isFirst ? [] : [{ label: t('routines.editor.menu.moveUp'), run: () => onMove(-1) }]),
      ...(isLast ? [] : [{ label: t('routines.editor.menu.moveDown'), run: () => onMove(1) }]),
      { label: t('routines.editor.menu.remove'), run: onRemove },
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        destructiveButtonIndex: actions.length - 1,
        cancelButtonIndex: actions.length,
        userInterfaceStyle: scheme,
      },
      (index) => actions[index]?.run(),
    );
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        {exercise ? <ExercisePicture exercise={exercise} size={48} /> : null}
        <Text variant="bodyStrong" style={styles.name}>
          {name}
        </Text>
        <MenuButton label={t('exercises.menu.label', { name })} onPress={openMenu} />
      </View>

      <View style={styles.controls}>
        <View style={styles.control}>
          <Text variant="caption" color="textMuted">
            {t('routines.editor.sets')}
          </Text>
          <Stepper
            value={String(item.plannedSets)}
            valueLabel={t('routines.editor.setsValue', { count: item.plannedSets })}
            onDecrement={() => onSetsChange(item.plannedSets - 1)}
            onIncrement={() => onSetsChange(item.plannedSets + 1)}
            decrementLabel={t('routines.editor.setsMinus')}
            incrementLabel={t('routines.editor.setsPlus')}
            canDecrement={item.plannedSets > PLANNED_SETS_MIN}
            canIncrement={item.plannedSets < PLANNED_SETS_MAX}
          />
        </View>
        <View style={styles.control}>
          <Text variant="caption" color="textMuted">
            {t('routines.editor.rest')}
          </Text>
          <Stepper
            value={formatRest(rest)}
            valueLabel={t('routines.editor.restValue', { time: formatRest(rest) })}
            // Grey while it follows the exercise's own rest.
            muted={item.restS === null}
            onDecrement={() => onRestChange(adjustRest(rest, -REST_STEP_S))}
            onIncrement={() => onRestChange(adjustRest(rest, REST_STEP_S))}
            decrementLabel={t('routines.editor.restMinus')}
            incrementLabel={t('routines.editor.restPlus')}
            canDecrement={rest > 0}
            canIncrement={rest < REST_MAX_S}
          />
        </View>
      </View>

      {item.restS === null ? (
        <Text variant="caption" color="textMuted">
          {t('routines.editor.restFromExercise')}
        </Text>
      ) : (
        <Button
          label={t('routines.editor.useExerciseRest')}
          variant="ghost"
          onPress={() => onRestChange(null)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  control: {
    gap: spacing.xs,
  },
});
