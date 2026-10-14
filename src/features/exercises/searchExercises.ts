import type { Language } from '@/lib/i18n';

import { exerciseName, type Exercise } from './exercise';
import type { Equipment, Muscle } from './vocabulary';

// Empty lists mean "any". Within a list, an exercise matches if it has any
// of the picked values (glutes OR hamstrings); across lists it must match
// all of them (… AND barbell).
export type ExerciseFilters = {
  query: string;
  muscles: Muscle[];
  equipment: Equipment[];
};

export const NO_FILTERS: ExerciseFilters = { query: '', muscles: [], equipment: [] };

// Combining accent marks (U+0300 to U+036F) and the Catalan middle dot.
const MARKS = /[\u0300-\u036f\u00b7]/g;

// Lowercase, without accents or the Catalan middle dot, so "jalo" finds
// "Jalón" and "ellip" finds "El·líptica".
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(MARKS, '').toLowerCase().trim();
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

function worksAnyOf(exercise: Exercise, muscles: readonly Muscle[]): boolean {
  return (
    muscles.length === 0 ||
    muscles.some(
      (muscle) =>
        exercise.primaryMuscles.includes(muscle) || exercise.secondaryMuscles.includes(muscle),
    )
  );
}

// How many of the picked muscles this exercise mainly trains.
function primaryHits(exercise: Exercise, muscles: readonly Muscle[]): number {
  return muscles.filter((muscle) => exercise.primaryMuscles.includes(muscle)).length;
}

// Filters by name, muscles and equipment. With muscles picked, exercises
// that mainly train more of them come first (Romanian deadlift before hip
// thrust for glutes + hamstrings), and ones that only work them as a
// secondary muscle come last. Ties are alphabetical in the app language.
export function searchExercises(
  exercises: readonly Exercise[],
  filters: ExerciseFilters,
  language: Language,
): Exercise[] {
  const { muscles, equipment } = filters;

  return exercises
    .filter(
      (exercise) =>
        matchesQuery(exercise, filters.query) &&
        worksAnyOf(exercise, muscles) &&
        (equipment.length === 0 || equipment.includes(exercise.equipment)),
    )
    .sort(
      (a, b) =>
        primaryHits(b, muscles) - primaryHits(a, muscles) ||
        exerciseName(a, language).localeCompare(exerciseName(b, language), language),
    );
}
