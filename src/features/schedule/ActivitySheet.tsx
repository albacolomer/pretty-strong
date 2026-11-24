import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, NumberInput, SegmentedControl, Sheet, Text, TextField } from '@/components/ui';
import type { Routine, Weekday } from '@/features/routines/routine';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
import { readMinutes } from '@/features/workout/session';
import { spacing } from '@/theme';

import {
  formatTimeTyping,
  readTime,
  SPORT_NAME_MAX_LENGTH,
  type Sport,
  type WeeklySport,
} from './sports';
import { IconChoice, SportGrid } from './SportGrid';
import { useActivityName } from './useActivityName';

// Whether something added is for that week only, or every week (the
// usual one).
export type Scope = 'week' | 'every';

export type ActivitySheetMode =
  | { kind: 'add'; day: Weekday }
  // A planned sport's time and duration.
  | { kind: 'edit'; sport: WeeklySport };

type ActivitySheetProps = {
  // What it's for; kept while it slides away after closing.
  mode: ActivitySheetMode;
  visible: boolean;
  // Routines not on that day yet.
  routines: Routine[];
  // Whether you have any routine at all.
  anyRoutines: boolean;
  onClose: () => void;
  onAddRoutine: (routine: Routine, day: Weekday, scope: Scope) => void;
  // "+ Crea una rutina nova": the editor (every week: with that day chosen).
  onCreateRoutine: (day: Weekday, scope: Scope) => void;
  // A new sport (id made here), or the one edited with its new time (its
  // scope is asked after).
  onSaveSport: (sport: WeeklySport, scope: Scope) => void;
};

// Pla → Setmana → "+ Afegeix" (US-09, US-29): a routine (or a new one,
// made in the editor), or a sport with an optional time and duration, for
// that day: that week only, or every week. Also changes a planned
// sport's time and duration. Give it a new key for each opening, so it
// starts afresh.
export function ActivitySheet({
  mode,
  visible,
  routines,
  anyRoutines,
  onClose,
  onAddRoutine,
  onCreateRoutine,
  onSaveSport,
}: ActivitySheetProps) {
  const { t } = useTranslation();
  const nameOf = useActivityName();
  const editing = mode.kind === 'edit' ? mode.sport : null;
  const [tab, setTab] = useState<'routine' | 'sport'>(editing ? 'sport' : 'routine');
  // The week on screen, unless said.
  const [scope, setScope] = useState<Scope>('week');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [sport, setSport] = useState<Sport | null>(editing?.sport ?? null);
  const [customName, setCustomName] = useState(editing?.customName ?? '');
  const [time, setTime] = useState(editing?.startTime ?? '');
  const [minutes, setMinutes] = useState(
    editing?.durationS ? String(Math.round(editing.durationS / 60)) : '',
  );

  const routine = routines.find((item) => item.id === routineId) ?? null;
  const day = mode.kind === 'add' ? mode.day : mode.sport.weekday;
  const dayName = t(`weekdays.long.${day}`);
  const title = editing
    ? nameOf({ kind: 'sport', sport: editing })
    : t('schedule.addToDay', { day: dayName });
  const name = customName.trim();
  const sportReady = sport !== null && (sport !== 'other' || name !== '');
  const chosenName =
    tab === 'routine'
      ? routine?.name
      : sport
        ? nameOf({ kind: 'sport', sport: { sport, customName: name || null } })
        : undefined;
  const saveLabel = editing
    ? t('schedule.save')
    : chosenName
      ? t('schedule.addNamed', { name: chosenName, day: dayName, dayLower: dayName.toLocaleLowerCase() })
      : t('schedule.add');

  function save() {
    if (tab === 'routine') {
      if (routine) onAddRoutine(routine, day, scope);
    } else if (sport && sportReady) {
      const details = { startTime: readTime(time), durationS: readMinutes(minutes) };
      onSaveSport(
        editing
          ? { ...editing, ...details }
          : {
              id: randomUUID(),
              weekday: day,
              sport,
              customName: sport === 'other' ? name : null,
              position: 0,
              ...details,
            },
        scope,
      );
    }
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      title={title}
      onCancel={onClose}
      onSave={save}
      saveLabel={saveLabel}
      saveDisabled={tab === 'routine' ? routine === null : !sportReady}>
      {editing ? null : (
        <>
          <SegmentedControl
            label={t('schedule.scope')}
            value={scope}
            onChange={setScope}
            options={[
              { value: 'week', label: t('schedule.onlyThisWeek') },
              { value: 'every', label: t('schedule.everyWeek') },
            ]}
          />
          <SegmentedControl
            label={t('schedule.kind')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'routine', label: t('schedule.routine') },
              { value: 'sport', label: t('schedule.sport') },
            ]}
          />
        </>
      )}

      {tab === 'routine' ? (
        <>
          {routines.length === 0 ? (
            <Text color="textMuted">
              {anyRoutines ? t('schedule.noRoutinesLeft') : t('schedule.noRoutinesYet')}
            </Text>
          ) : (
            <View role="radiogroup" aria-label={t('schedule.routine')} style={styles.list}>
              {routines.map((item) => (
                <IconChoice
                  key={item.id}
                  icon={ROUTINE_ICONS[item.label]}
                  label={item.name}
                  selected={item.id === routineId}
                  onPress={() => setRoutineId(item.id)}
                  wide
                />
              ))}
            </View>
          )}
          <Button
            label={t('workout.newRoutine')}
            aria-label={t('schedule.newRoutineFor', { day: dayName })}
            icon="plus"
            variant="ghost"
            onPress={() => onCreateRoutine(day, scope)}
          />
        </>
      ) : (
        <>
          {editing ? null : (
            <SportGrid value={sport} onChange={setSport} />
          )}
          {sport === 'other' && !editing ? (
            <TextField
              label={t('schedule.sportName')}
              placeholder={t('schedule.sportNamePlaceholder')}
              value={customName}
              onChangeText={setCustomName}
              maxLength={SPORT_NAME_MAX_LENGTH}
              autoFocus
            />
          ) : null}
          <View style={styles.row}>
            <NumberInput
              label={t('schedule.time')}
              value={time}
              onChangeText={(text) => setTime(formatTimeTyping(text))}
              placeholder="19:00"
              maxLength={5}
              style={styles.field}
            />
            <NumberInput
              label={t('schedule.durationMin')}
              value={minutes}
              onChangeText={setMinutes}
              placeholder="60"
              maxLength={4}
              style={styles.field}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  field: {
    width: 120,
  },
  pressed: {
    opacity: 0.75,
  },
});
