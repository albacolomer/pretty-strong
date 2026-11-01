import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import type { Routine } from './routine';
import { RoutineTypeTag } from './RoutineTypeTag';
import { useArchivedRoutines, useArchiveRoutineWithUndo } from './useArchiveRoutine';
import { useRoutineSummary } from './useRoutineSummary';
import { useRoutines } from './useRoutines';

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
  const summary = useRoutineSummary(routine, { withDays: true });

  return (
    <Pressable role="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.titleRow}>
          <Text variant="name" numberOfLines={2} style={styles.name}>
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
