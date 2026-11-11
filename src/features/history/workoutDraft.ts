import type { Routine } from '@/features/routines/routine';
import { NO_TARGETS } from '@/features/routines/routine';
import { fromDateKey } from '@/features/schedule/dates';
import {
  shownNumbers,
  workoutFromRoutine,
  type ActiveWorkout,
} from '@/features/workout/activeWorkout';
import type { Feeling } from '@/features/workout/session';

import { workoutDuration, type PastExercise, type PastWorkout } from './pastWorkout';

// Editing a past workout (US-23) and logging one afterwards (US-24) use the
// live workout's model, so the same cards and menus work on them: a draft
// is an ActiveWorkout, its done sets the ones that get saved. No React here.

// What's edited above the exercises.
export type DraftDetails = {
  date: string;
  // Null: not given (a quick log may have none).
  durationS: number | null;
  feeling: Feeling | null;
  notes: string;
};

// A saved workout as a draft: every set done (ticked), with its numbers
// typed in, and every cardio field shown.
export function draftFromPast(past: PastWorkout): ActiveWorkout {
  return {
    id: past.id,
    date: past.date,
    plannedRoutineId: past.plannedRoutineId,
    routineId: past.routineId,
    routineName: past.routineName ?? '',
    changeReason: past.changeReason,
    startedAt: past.startedAt ?? doneAt(past.date),
    rest: null,
    // Its numbers are already what was done.
    lastTimeLoaded: true,
    exercises: past.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exercise: exercise.exercise,
      routineExerciseId: exercise.routineExerciseId,
      groupKey: exercise.groupKey,
      restS: exercise.restS ?? 0,
      routineNote: null,
      notes: exercise.notes ?? '',
      sets: exercise.sets.map((set) => ({
        id: set.id,
        planned: NO_TARGETS,
        typed: set.numbers,
        setType: set.setType,
        rpe: set.rpe,
        completedAt: set.completedAt,
      })),
      previous: null,
      change: exercise.change,
      swappedFromId: exercise.replaced?.id ?? null,
      replaced: exercise.replaced,
      changeReason: exercise.changeReason,
      runBlock: null,
      measures: null,
      allFields: true,
    })),
  };
}

export function detailsFromPast(past: PastWorkout): DraftDetails {
  return {
    date: past.date,
    durationS: workoutDuration(past),
    feeling: past.feeling,
    notes: past.notes ?? '',
  };
}

// A new draft for a workout done on `date` (US-24): the routine's exercises
// with its plan, to be ticked off, or nothing yet without a routine.
export function draftForDay(
  routine: Routine | null,
  date: string,
  newId: () => string,
  defaultRestS: (exerciseId: string) => number,
): ActiveWorkout {
  if (routine) {
    return workoutFromRoutine(routine, {
      date,
      plannedRoutineId: null,
      changeReason: null,
      startedAt: doneAt(date),
      newId,
      defaultRestS,
    });
  }
  return {
    id: newId(),
    date,
    plannedRoutineId: null,
    routineId: null,
    routineName: '',
    changeReason: null,
    startedAt: doneAt(date),
    rest: null,
    lastTimeLoaded: true,
    exercises: [],
  };
}

// When a set ticked off afterwards counts as done (data rule 7): the
// workout's end when it has one, else midday that day.
export function doneAt(date: string, endedAt?: string | null): string {
  if (endedAt) return endedAt;
  const day = fromDateKey(date);
  day.setHours(12);
  return day.toISOString();
}

// Moves a moment by whole days, keeping its time of day.
function shiftDays(moment: string, from: string, to: string): string {
  const days = Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / 86_400_000);
  const shifted = new Date(moment);
  shifted.setDate(shifted.getDate() + days);
  return shifted.toISOString();
}

// The draft back as a workout to save. Like finishing one: only sets that
// are ticked, only exercises with some, plus the skipped ones. A live
// workout keeps its start (moved to the new date) and ends after the
// duration; a quick one just has the duration.
export function toPastWorkout(
  draft: ActiveWorkout,
  details: DraftDetails,
  original: PastWorkout | null,
): PastWorkout {
  const live = original?.logMode === 'live' && original.startedAt !== null;
  const startedAt = live ? shiftDays(original.startedAt!, original.date, details.date) : null;
  const endedAt =
    live && startedAt
      ? details.durationS !== null
        ? new Date(new Date(startedAt).getTime() + details.durationS * 1000).toISOString()
        : shiftDays(original.endedAt ?? startedAt, original.date, details.date)
      : null;

  const exercises: PastExercise[] = draft.exercises
    .map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exercise: exercise.exercise,
      replaced: exercise.replaced,
      routineExerciseId: exercise.routineExerciseId,
      groupKey: exercise.groupKey,
      restS: exercise.restS,
      change: exercise.change,
      changeReason: exercise.changeReason,
      notes: exercise.notes.trim() === '' ? null : exercise.notes.trim(),
      sets:
        exercise.change === 'skipped'
          ? []
          : exercise.sets
              .filter((set) => set.completedAt !== null)
              .map((set) => ({
                id: set.id,
                setType: set.setType,
                numbers: shownNumbers(set),
                rpe: set.rpe,
                completedAt: shiftDays(set.completedAt!, draft.date, details.date),
              })),
    }))
    .filter((exercise) => exercise.sets.length > 0 || exercise.change === 'skipped');

  return {
    id: draft.id,
    date: details.date,
    plannedRoutineId: draft.plannedRoutineId,
    routineId: draft.routineId,
    routineName: draft.routineName === '' ? null : draft.routineName,
    changeReason: draft.changeReason,
    logMode: live ? 'live' : 'quick',
    startedAt,
    endedAt,
    durationS: live ? null : details.durationS,
    feeling: details.feeling,
    notes: details.notes.trim() === '' ? null : details.notes.trim(),
    // A sport's or an event's session stays one.
    plannedSportId: original?.plannedSportId ?? null,
    sport: original?.sport ?? null,
    sportName: original?.sportName ?? null,
    plannedEventId: original?.plannedEventId ?? null,
    eventKind: original?.eventKind ?? null,
    eventName: original?.eventName ?? null,
    exercises,
  };
}
