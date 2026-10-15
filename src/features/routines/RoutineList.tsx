import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import type { Routine } from './routine';
import { useRoutines } from './useRoutines';

// How many exercise names a card shows before "…".
const PREVIEW_COUNT = 3;

// Plan → Rutines (US-07).
export function RoutineList() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: routines, isPending, isError } = useRoutines();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

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
          />
        ))
      )}
    </View>
  );
}

// Name, label, and "4 exercicis · Tracció al pit, Rem assegut…".
function RoutineCard({ routine, onPress }: { routine: Routine; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();

  const names = routine.exercises.map((item) => exerciseName(item.exercise, language));
  const preview =
    names.slice(0, PREVIEW_COUNT).join(', ') + (names.length > PREVIEW_COUNT ? '…' : '');
  const summary =
    names.length === 0
      ? t('routines.noExercises')
      : `${t('routines.exerciseCount', { count: names.length })} · ${preview}`;

  return (
    <Pressable role="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.titleRow}>
          <Text variant="cardTitle" style={styles.name}>
            {routine.name}
          </Text>
          <View style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
            <Text variant="caption" color="accent">
              {t(`routines.labels.${routine.label}`)}
            </Text>
          </View>
        </View>
        <Text variant="caption" color="textMuted" numberOfLines={2}>
          {summary}
        </Text>
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
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.75,
  },
});
