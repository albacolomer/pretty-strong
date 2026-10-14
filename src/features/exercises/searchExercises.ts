import type { Language } from '@/lib/i18n';

import { exerciseName, type Exercise } from './exercise';
import type { Equipment, Muscle } from './vocabulary';

export type ExerciseFilters = {
  query: string;
  muscle: Muscle | null;
  equipment: Equipment | null;
};

export const NO_FILTERS: ExerciseFilters = { query: '', muscle: null, equipment: null };

// Lowercase, without accents or the Catalan middle dot, so "jalo" finds
// "Jalón" and "ellip" finds "El·líptica".
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ·]/g, '')
    .toLowerCase()
    .trim();
}

// Every word of the query must appear in the same name, in any of the
// three languages: "press banca" finds "Press de banca amb barra".
function matchesQuery(exercise: Exercise, query: string): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const names = exercise.names ? Object.values(exercise.names) : [exercise.name ?? ''];
  return names.some((name) => {
    const normalized = normalizeForSearch(name);
    return words.every((word) => normalized.includes(word));
  });
}

function matchesMuscle(exercise: Exercise, muscle: Muscle | null): boolean {
  return (
    muscle === null ||
    exercise.primaryMuscles.includes(muscle) ||
    exercise.secondaryMuscles.includes(muscle)
  );
}

// Filters by name, muscle and equipment. With a muscle picked, exercises
// where it is a primary muscle come first; otherwise alphabetical in the
// app language.
export function searchExercises(
  exercises: readonly Exercise[],
  filters: ExerciseFilters,
  language: Language,
): Exercise[] {
  const { muscle, equipment } = filters;
  const isSecondaryOnly = (exercise: Exercise) =>
    muscle !== null && !exercise.primaryMuscles.includes(muscle) ? 1 : 0;

  return exercises
    .filter(
      (exercise) =>
        matchesQuery(exercise, filters.query) &&
        matchesMuscle(exercise, muscle) &&
        (equipment === null || exercise.equipment === equipment),
    )
    .sort(
      (a, b) =>
        isSecondaryOnly(a) - isSecondaryOnly(b) ||
        exerciseName(a, language).localeCompare(exerciseName(b, language), language),
    );
}
