import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { formatDuration, usesExercises, usesPlannedDuration, type Routine } from './routine';
import { RoutineTypeTag } from './RoutineTypeTag';
import { runBlockKind, runBlockSummary } from './runBlocks';
import { useArchivedRoutines, useArchiveRoutineWithUndo } from './useArchiveRoutine';
import { useRoutines } from './useRoutines';

// How many exercise names a card shows before "…".
const PREVIEW_COUNT = 3;

// Plan → Rutines (US-07).
export function RoutineList() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const { data: routines, isPending, isError } = useRoutines();
  const { data: archived = [] } = useArchivedRoutines();
  const archiveRoutine = useArchiveRoutineWithUndo();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

  // The native iOS action sheet. Archiving isn't shown as destructive: it
  // can always be undone.
  function openMenu(routine: Routine) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: routine.name,
        options: [t('routines.archive'), t('common.cancel')],
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) archiveRoutine(routine);
      },
    );
  }

  return (
    <View style={styles.list}>
      <Button label={t('routines.new')} onPress={() => router.push('/plan/routines/new')} />

      {routines.length === 0 ? (
        <Card>
          <Text variant="cardTitle">{t('routines.empty.title')}</Text>
          <Text color="textMuted">{t('routines.empty.hint')}</Text>
        </Card>
      ) : (
        routines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onPress={() =>
              router.push({ pathname: '/plan/routines/[id]', params: { id: routine.id } })
            }
            onMenu={() => openMenu(routine)}
          />
        ))
      )}

      {archived.length > 0 ? (
        <Button
          label={t('routines.archivedLink', { count: archived.length })}
          variant="ghost"
          onPress={() => router.push('/plan/routines/archived')}
        />
      ) : null}
    </View>
  );
}

// Name, type, and "Dl, Dj · 1 h · 4 exercicis · Tracció al pit, Rem assegut…".
type RoutineCardProps = {
  routine: Routine;
  onPress: () => void;
  onMenu: () => void;
};

function RoutineCard({ routine, onPress, onMenu }: RoutineCardProps) {
  const { t } = useTranslation();
  const language = useAppLanguage();

  const isRun = routine.label === 'run';
  // A run's blocks are all the run exercise: describe them, e.g. "6 × 400 m".
  const names = routine.exercises.map((item) =>
    isRun
      ? runBlockSummary(runBlockKind(item.sets), item.sets, language)
      : exerciseName(item.exercise, language),
  );
  const preview =
    names.slice(0, PREVIEW_COUNT).join(', ') + (names.length > PREVIEW_COUNT ? '…' : '');
  const count = isRun
    ? t('routines.blockCount', { count: names.length })
    : t('routines.exerciseCount', { count: names.length });
  const exercisesSummary =
    names.length === 0 ? t('routines.noExercises') : `${count} · ${preview}`;
  // E.g. "Dl, Dj · 1 h · 4 exercicis · …"; a class shows no exercises.
  const summary = [
    routine.weekdays.length > 0
      ? routine.weekdays.map((day) => t(`weekdays.short.${day}`)).join(', ')
      : null,
    usesPlannedDuration(routine.label) && routine.plannedDurationS !== null
      ? formatDuration(routine.plannedDurationS)
      : null,
    usesExercises(routine.label) ? exercisesSummary : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');

  return (
    <Pressable role="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.titleRow}>
          <Text variant="cardTitle" style={styles.name}>
            {routine.name}
          </Text>
          <RoutineTypeTag routine={routine} />
          <MenuButton label={t('exercises.menu.label', { name: routine.name })} onPress={onMenu} />
        </View>
        {summary !== '' ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
