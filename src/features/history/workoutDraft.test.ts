import { NO_TARGETS } from '@/features/routines/routine';
import { testExercise, upperBody } from '@/features/routines/testData';
import { addSet, skipExercise, toggleSet, updateTyped } from '@/features/workout/activeWorkout';

import type { PastWorkout } from './pastWorkout';
import { detailsFromPast, doneAt, draftForDay, draftFromPast, toPastWorkout } from './workoutDraft';

const lift = (weightKg: number, reps: number) => ({ ...NO_TARGETS, weightKg, reps });

const past: PastWorkout = {
  id: 'session-1',
  date: '2026-10-20',
  plannedRoutineId: 'routine-1',
  routineId: 'routine-1',
  routineName: 'Tren superior 1',
  changeReason: null,
  logMode: 'live',
  startedAt: '2026-10-20T17:00:00.000Z',
  endedAt: '2026-10-20T18:00:00.000Z',
  durationS: null,
  feeling: 3,
  notes: null,
  plannedSportId: null,
  sport: null,
  sportName: null,
  plannedEventId: null,
  eventKind: null,
  eventName: null,
  plannedAdditionId: null,
  exercises: [
    {
      id: 'se-1',
      exerciseId: 'lat',
      exercise: testExercise('lat', 'Tracció al pit'),
      replaced: null,
      routineExerciseId: 're-1',
      groupKey: null,
      restS: 90,
      change: null,
      changeReason: null,
      notes: null,
      sets: [
        { id: 'set-1', setType: 'normal', numbers: lift(40, 10), rpe: null, completedAt: '2026-10-20T17:10:00.000Z' },
        { id: 'set-2', setType: 'normal', numbers: lift(40, 9), rpe: null, completedAt: '2026-10-20T17:13:00.000Z' },
      ],
    },
  ],
};

let ids = 0;
const newId = () => `id-${(ids += 1)}`;

describe('editing a past workout (US-23)', () => {
  test('unchanged, it saves back exactly as it was', () => {
    expect(toPastWorkout(draftFromPast(past), detailsFromPast(past), past)).toEqual(past);
  });

  test('changed numbers, an extra set, an unticked one, how it felt and a note', () => {
    let draft = draftFromPast(past);
    const [lat] = draft.exercises;
    draft = updateTyped(draft, lat.id, 'set-1', () => lift(42.5, 10));
    draft = toggleSet(draft, lat.id, 'set-2', 'ignored');
    draft = addSet(draft, lat.id, 'set-3');
    draft = toggleSet(draft, lat.id, 'set-3', '2026-10-20T18:00:00.000Z');

    const saved = toPastWorkout(draft, { ...detailsFromPast(past), feeling: 5, notes: ' Bé ' }, past);

    expect(saved.exercises[0].sets.map((set) => [set.id, set.numbers.weightKg, set.numbers.reps])).toEqual([
      ['set-1', 42.5, 10],
      // The new set starts from the one before it, as in a workout.
      ['set-3', 40, 9],
    ]);
    expect(saved).toMatchObject({ feeling: 5, notes: 'Bé' });
  });

  test('a new date moves its times; a new duration moves its end', () => {
    const saved = toPastWorkout(
      draftFromPast(past),
      { ...detailsFromPast(past), date: '2026-10-18', durationS: 45 * 60 },
      past,
    );

    expect(saved).toMatchObject({
      date: '2026-10-18',
      logMode: 'live',
      startedAt: '2026-10-18T17:00:00.000Z',
      endedAt: '2026-10-18T17:45:00.000Z',
      durationS: null,
    });
    expect(saved.exercises[0].sets[0].completedAt).toBe('2026-10-18T17:10:00.000Z');
  });

  test('a quick log gets its exercises later, keeping its duration', () => {
    const quick: PastWorkout = { ...past, logMode: 'quick', startedAt: null, endedAt: null, durationS: 3000, exercises: [] };
    let draft = draftFromPast(quick);
    draft = { ...draft, exercises: draftForDay(upperBody, quick.date, newId, () => 90).exercises.slice(0, 1) };
    const [first] = draft.exercises;
    draft = updateTyped(draft, first.id, first.sets[0].id, () => lift(30, 12));
    draft = toggleSet(draft, first.id, first.sets[0].id, doneAt(quick.date));

    const saved = toPastWorkout(draft, detailsFromPast(quick), quick);

    expect(saved).toMatchObject({ logMode: 'quick', durationS: 3000, startedAt: null, endedAt: null });
    expect(saved.exercises).toHaveLength(1);
    expect(saved.exercises[0].sets).toHaveLength(1);
  });
});

describe('logging a workout afterwards (US-24)', () => {
  test('from a routine: ticked sets only, as a quick log with its duration', () => {
    let draft = draftForDay(upperBody, '2026-10-15', newId, () => 90);
    const [lat, row] = draft.exercises;
    draft = updateTyped(draft, lat.id, lat.sets[0].id, () => lift(40, 10));
    draft = toggleSet(draft, lat.id, lat.sets[0].id, doneAt('2026-10-15'));
    draft = skipExercise(draft, row.id, { reason: null });

    const saved = toPastWorkout(
      draft,
      { date: '2026-10-15', durationS: 3600, feeling: null, notes: '' },
      null,
    );

    expect(saved).toMatchObject({
      date: '2026-10-15',
      routineId: 'routine-1',
      routineName: 'Tren superior 1',
      logMode: 'quick',
      durationS: 3600,
      startedAt: null,
      notes: null,
    });
    expect(saved.exercises.map((exercise) => [exercise.exerciseId, exercise.sets.length, exercise.change])).toEqual([
      ['exercise-1', 1, null],
      ['exercise-2', 0, 'skipped'],
    ]);
    expect(saved.exercises[0].sets[0].completedAt).toBe(doneAt('2026-10-15'));
  });

  test('without a routine it starts empty', () => {
    const draft = draftForDay(null, '2026-10-15', newId, () => 90);
    expect(draft).toMatchObject({ routineId: null, routineName: '', exercises: [] });
    expect(toPastWorkout(draft, { date: '2026-10-15', durationS: null, feeling: null, notes: '' }, null).routineName).toBeNull();
  });
});
