import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Text, useToast } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import type { Routine } from './routine';
import { RoutineTypeTag } from './RoutineTypeTag';
import { useArchivedRoutines, useRestoreRoutine } from './useArchiveRoutine';

// Plan → Rutines → Rutines arxivades: bring a routine back (US-06).
export function ArchivedRoutines() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showToast = useToast();
  const { data: archived, isPending, isError } = useArchivedRoutines();
  const restore = useRestoreRoutine();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;
  if (archived.length === 0) return <Text color="textMuted">{t('routines.noArchived')}</Text>;

  // Errors are shown by the restore hook itself.
  function restoreRoutine(routine: Routine) {
    restore.mutate(routine.id, {
      onSuccess: () => showToast({ message: t('routines.restored', { name: routine.name }) }),
    });
  }

  return (
    <View style={styles.list}>
      {archived.map((routine) => (
        <Card key={routine.id}>
          <View style={styles.row}>
            <Text variant="bodyStrong" style={styles.name}>
              {routine.name}
            </Text>
            <RoutineTypeTag routine={routine} />
          </View>
          <Button
            label={t('routines.restore')}
            variant="secondary"
            onPress={() => restoreRoutine(routine)}
            disabled={restore.isPending}
          />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
});
