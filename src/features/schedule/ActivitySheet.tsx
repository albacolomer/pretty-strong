import { randomUUID } from 'expo-crypto';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { NumberInput, SegmentedControl, Sheet, Text, TextField } from '@/components/ui';
import type { Routine, Weekday } from '@/features/routines/routine';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
import { readMinutes } from '@/features/workout/session';
import { radius, spacing, touch, useTheme } from '@/theme';

import {
  formatTimeTyping,
  readTime,
  SPORT_ICONS,
  SPORT_NAME_MAX_LENGTH,
  SPORTS,
  type Sport,
  type WeeklySport,
} from './sports';
import { useActivityName } from './useActivityName';

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
  onAddRoutine: (routine: Routine, day: Weekday) => void;
  // A new sport (id made here), or the one edited with its new time.
  onSaveSport: (sport: WeeklySport) => void;
};

// Pla → Setmana → "+ Afegeix" (US-09): a routine, or a sport with an
// optional time and duration, for that day. Also changes a planned
// sport's time and duration. Give it a new key for each opening, so it
// starts afresh.
export function ActivitySheet({
  mode,
  visible,
  routines,
  anyRoutines,
  onClose,
  onAddRoutine,
  onSaveSport,
}: ActivitySheetProps) {
  const { t } = useTranslation();
  const nameOf = useActivityName();
  const editing = mode.kind === 'edit' ? mode.sport : null;
  const [tab, setTab] = useState<'routine' | 'sport'>(editing ? 'sport' : 'routine');
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
      if (routine) onAddRoutine(routine, day);
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
        <SegmentedControl
          label={t('schedule.kind')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'routine', label: t('schedule.routine') },
            { value: 'sport', label: t('schedule.sport') },
          ]}
        />
      )}

      {tab === 'routine' ? (
        routines.length === 0 ? (
          <Text color="textMuted">
            {anyRoutines ? t('schedule.noRoutinesLeft') : t('schedule.noRoutines')}
          </Text>
        ) : (
          <View role="radiogroup" aria-label={t('schedule.routine')} style={styles.list}>
            {routines.map((item) => (
              <Choice
                key={item.id}
                icon={ROUTINE_ICONS[item.label]}
                label={item.name}
                selected={item.id === routineId}
                onPress={() => setRoutineId(item.id)}
                wide
              />
            ))}
          </View>
        )
      ) : (
        <>
          {editing ? null : (
            <View role="radiogroup" aria-label={t('schedule.sport')} style={styles.grid}>
              {SPORTS.map((item) => (
                <Choice
                  key={item}
                  icon={SPORT_ICONS[item]}
                  label={t(`sports.${item}`)}
                  selected={item === sport}
                  onPress={() => setSport(item)}
                />
              ))}
            </View>
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

// One option: an icon and its name; the chosen one is pink with a ✓.
function Choice({
  icon,
  label,
  selected,
  onPress,
  wide = false,
}: {
  icon: (typeof SPORT_ICONS)[Sport];
  label: string;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [
        wide ? styles.wide : styles.tile,
        {
          borderColor: selected ? colors.accent : colors.surfaceRaised,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
        },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={icon} size={22} tintColor={selected ? colors.accent : colors.text} />
      <Text variant="bodyStrong" numberOfLines={1} style={wide ? styles.wideLabel : undefined}>
        {label}
      </Text>
      {selected ? (
        <View style={[styles.check, { backgroundColor: colors.accent }]}>
          <SymbolView name="checkmark" size={10} tintColor={colors.onAccent} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 76,
    borderWidth: 1.5,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    borderWidth: 1.5,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
  },
  wideLabel: {
    flex: 1,
  },
  check: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
