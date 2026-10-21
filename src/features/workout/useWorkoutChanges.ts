import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS } from 'react-native';

import { useToast } from '@/components/ui';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import { useExerciseSettings } from '@/features/exercises/useExerciseSettings';
import { useExercises } from '@/features/exercises/useExercises';
import { TARGET_INPUTS, formatInput } from '@/features/routines/targets';
import { isNetworkError } from '@/lib/errors';
import { useAppLanguage } from '@/lib/i18n';
import { useTheme } from '@/theme';

import {
  addExercises,
  addSet,
  applyLastTimeTo,
  canSwap,
  removeExercise,
  removeSet,
  setExerciseNotes,
  setRpe,
  setSetType,
  showAllFields,
  skipExercise,
  swapExercise,
  type ActiveExercise,
  type ActiveWorkout,
} from './activeWorkout';
import { fetchLastTime, saveNoteToRoutine } from './api';
import { workoutInputs } from './cardio';
import { EXERCISE_CHANGE_REASONS, type ExerciseChangeReason } from './session';
import { useExerciseTitle } from './useExerciseTitle';

// Only these can have drop sets: there's a weight to drop.
const DROP_SET_TYPES = ['weight_reps', 'bodyweight_reps', 'weight_distance'];

// RPE values offered, from moderate to all-out.
const RPE_VALUES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];

type Action = { label: string; run: () => void };

// Where the workout being changed lives: the live one in the workout store,
// or a past one being edited in History. `current` reads it as it is now,
// right after an update.
export type WorkoutSource = {
  update: (change: (workout: ActiveWorkout) => ActiveWorkout) => void;
  current: () => ActiveWorkout | null;
};

// Changes during the workout (US-15, US-16), for this workout only: add,
// swap, skip or remove exercises; add or remove sets; drop sets and RPE;
// reorder; this workout's notes. Menus are the native iOS action sheets.
export function useWorkoutChanges(workout: ActiveWorkout, source: WorkoutSource) {
  const { update } = source;
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const titleOf = useExerciseTitle();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { data: library = [] } = useExercises();
  const { data: settings } = useExerciseSettings();
  // The exercise picker: closed, adding, or swapping one exercise.
  const [picker, setPicker] = useState<{ swapId: string | null } | null>(null);
  const [reordering, setReordering] = useState(false);
  // Swapped and waiting for the picker to close, to ask why.
  const swappedId = useRef<string | null>(null);

  function sheet(title: string, actions: Action[], destructive?: number) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: destructive,
        userInterfaceStyle: scheme,
      },
      (index) => actions[index]?.run(),
    );
  }

  // Optional, as the spec's reason chips: "Sense motiu" goes on without one.
  function askReason(title: string, onPick: (reason: ExerciseChangeReason | null) => void) {
    sheet(title, [
      ...EXERCISE_CHANGE_REASONS.map((reason) => ({
        label: t(`workout.exerciseReasons.${reason}`),
        run: () => onPick(reason),
      })),
      { label: t('workout.noReason'), run: () => onPick(null) },
    ]);
  }

  // Last time for exercises added or swapped in; with no signal, they just
  // stay empty.
  function fillFromLastTime(ids: string[], exerciseIds: string[]) {
    fetchLastTime(workout.routineId, exerciseIds)
      .then((lastTime) => update((current) => applyLastTimeTo(current, ids, lastTime)))
      .catch(() => {});
  }

  function nameOf(exercise: ActiveExercise) {
    return titleOf(exercise);
  }

  function skip(exercise: ActiveExercise) {
    askReason(t('workout.skipReasonTitle'), (reason) => {
      update((current) => skipExercise(current, exercise.id, { reason }));
      showToast({
        message: t('workout.skippedExercise', { name: nameOf(exercise) }),
        action: {
          label: t('common.undo'),
          onPress: () => update((current) => skipExercise(current, exercise.id, null)),
        },
      });
    });
  }

  // Only exercises added in this workout; undo puts it back where it was.
  function remove(exercise: ActiveExercise) {
    const index = workout.exercises.findIndex((item) => item.id === exercise.id);
    update((current) => removeExercise(current, exercise.id));
    showToast({
      message: t('workout.removedExercise', { name: nameOf(exercise) }),
      action: {
        label: t('common.undo'),
        onPress: () =>
          update((current) => ({
            ...current,
            exercises: [
              ...current.exercises.slice(0, index),
              exercise,
              ...current.exercises.slice(index),
            ],
          })),
      },
    });
  }

  function openExerciseMenu(exercise: ActiveExercise) {
    const skipped = exercise.change === 'skipped';
    sheet(nameOf(exercise), [
      ...(!skipped && canSwap(exercise)
        ? [{ label: t('workout.swapExercise'), run: () => setPicker({ swapId: exercise.id }) }]
        : []),
      ...(exercise.change === 'added'
        ? [{ label: t('workout.removeExercise'), run: () => remove(exercise) }]
        : skipped
          ? [
              {
                label: t('workout.unskipExercise'),
                run: () => update((current) => skipExercise(current, exercise.id, null)),
              },
            ]
          : [{ label: t('workout.skipExercise'), run: () => skip(exercise) }]),
      // A cardio machine showing only the fields in use.
      ...(!skipped &&
      workoutInputs(exercise).length < TARGET_INPUTS[exercise.exercise.trackingType].length
        ? [
            {
              label: t('workout.allFields'),
              run: () => update((current) => showAllFields(current, exercise.id)),
            },
          ]
        : []),
      ...(workout.exercises.length > 1
        ? [{ label: t('routines.reorder.open'), run: () => setReordering(true) }]
        : []),
    ]);
  }

  function chooseRpe(exercise: ActiveExercise, setId: string, current: number | null) {
    sheet(t('workout.rpeTitle'), [
      ...RPE_VALUES.map((value) => ({
        label: formatInput(value, language),
        run: () => update((workout) => setRpe(workout, exercise.id, setId, value)),
      })),
      ...(current !== null
        ? [
            {
              label: t('workout.removeRpe'),
              run: () => update((workout) => setRpe(workout, exercise.id, setId, null)),
            },
          ]
        : []),
    ]);
  }

  // Tap a set's number: drop set, RPE, or remove it. A cardio machine's
  // segment has no drop set.
  function openSetMenu(exercise: ActiveExercise, setId: string) {
    const index = exercise.sets.findIndex((set) => set.id === setId);
    const set = exercise.sets[index];
    if (!set) return;
    const drop = set.setType === 'drop';
    const segment = exercise.exercise.trackingType === 'cardio_machine';
    const names = { name: nameOf(exercise), number: index + 1 };
    const actions: Action[] = [
      ...(drop || DROP_SET_TYPES.includes(exercise.exercise.trackingType)
        ? [
            {
              label: drop ? t('workout.normalSet') : t('workout.dropSet'),
              run: () =>
                update((current) =>
                  setSetType(current, exercise.id, setId, drop ? 'normal' : 'drop'),
                ),
            },
          ]
        : []),
      {
        label:
          set.rpe === null
            ? t('workout.addRpe')
            : t('workout.changeRpe', { rpe: formatInput(set.rpe, language) }),
        run: () => chooseRpe(exercise, setId, set.rpe),
      },
      ...(exercise.sets.length > 1
        ? [
            {
              label: segment ? t('workout.segments.remove') : t('routines.sets.remove'),
              run: () => update((current) => removeSet(current, exercise.id, setId)),
            },
          ]
        : []),
    ];
    sheet(
      segment ? t('workout.segments.rowName', names) : t('routines.sets.rowName', names),
      actions,
      exercise.sets.length > 1 ? actions.length - 1 : undefined,
    );
  }

  function pickerDone(exerciseIds: string[]) {
    const chosen = exerciseIds
      .map((id) => library.find((exercise) => exercise.id === id))
      .filter((exercise) => exercise !== undefined);
    const swapId = picker?.swapId ?? null;
    setPicker(null);
    if (chosen.length === 0) return;

    if (swapId) {
      const [replacement] = chosen;
      update((current) => swapExercise(current, swapId, replacement, null, randomUUID));
      fillFromLastTime([swapId], [replacement.id]);
      // Why, once the picker has closed (see onPickerDismissed).
      swappedId.current = swapId;
      return;
    }

    const before = new Set(workout.exercises.map((exercise) => exercise.id));
    update((current) =>
      addExercises(
        current,
        chosen.map((exercise) => ({
          exercise,
          restS: settings?.[exercise.id]?.defaultRestS ?? APP_DEFAULT_REST_S,
        })),
        randomUUID,
      ),
    );
    const added = (source.current()?.exercises ?? []).filter(
      (exercise) => !before.has(exercise.id),
    );
    fillFromLastTime(
      added.map((exercise) => exercise.id),
      chosen.map((exercise) => exercise.id),
    );
  }

  function onPickerDismissed() {
    const id = swappedId.current;
    swappedId.current = null;
    if (!id) return;
    askReason(t('workout.swapReasonTitle'), (reason) =>
      update((current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === id ? { ...exercise, changeReason: reason } : exercise,
        ),
      })),
    );
  }

  function saveNote(exercise: ActiveExercise) {
    if (!exercise.routineExerciseId) return;
    saveNoteToRoutine(exercise.routineExerciseId, exercise.notes)
      .then(() => {
        showToast({ message: t('workout.noteSavedToRoutine') });
        return queryClient.invalidateQueries({ queryKey: ['routines'] });
      })
      .catch((error: unknown) =>
        showToast({
          message: isNetworkError(error) ? t('workout.noSignal') : t('workout.saveError'),
        }),
      );
  }

  return {
    picker,
    openAddPicker: () => setPicker({ swapId: null }),
    closePicker: () => setPicker(null),
    pickerDone,
    onPickerDismissed,
    reordering,
    closeReorder: () => setReordering(false),
    reorderDone: (exercises: ActiveExercise[]) => {
      update((current) => ({ ...current, exercises }));
      setReordering(false);
    },
    openExerciseMenu,
    openSetMenu,
    addSet: (exercise: ActiveExercise) =>
      update((current) => addSet(current, exercise.id, randomUUID())),
    setNotes: (exercise: ActiveExercise, notes: string) =>
      update((current) => setExerciseNotes(current, exercise.id, notes)),
    saveNote,
  };
}
