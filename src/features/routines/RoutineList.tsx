import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text } from '@/components/ui';
import { inset, radius, spacing, touch, useTheme } from '@/theme';

import type { Routine } from './routine';
import { ROUTINE_ICONS } from './routineIcons';
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

// The type's icon, the name and what's in it ("4 exercicis", "4,4 km"),
// then the days it's planned on as bubbles, next to ⋮.
type RoutineCardProps = {
  routine: Routine;
  onPress: () => void;
  onMenu: () => void;
};

const ICON = 40;
const DAY = 24;
// How far ⋮ sits from the card's top-right corner.
const MENU_EDGE = spacing.xs;

function RoutineCard({ routine, onPress, onMenu }: RoutineCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const summary = useRoutineSummary(routine);
  const type = routine.customLabel ?? t(`routines.labels.${routine.label}`);
  const days = routine.weekdays.map((day) => t(`weekdays.long.${day}`));

  return (
    <Card>
      <Pressable
        role="button"
        // Read as one: "Tren superior 1, Força, 4 exercicis, Dilluns, Dijous".
        aria-label={[routine.name, type, summary, ...days].filter(Boolean).join(', ')}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <SymbolView
            name={ROUTINE_ICONS[routine.label]}
            size={20}
            weight="light"
            tintColor={colors.accent}
          />
        </View>
        <View style={styles.text}>
          <Text variant="name" numberOfLines={2}>
            {routine.name}
          </Text>
          {summary !== '' ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        {routine.weekdays.length > 0 ? (
          <View style={styles.days}>
            {routine.weekdays.map((day) => (
              <View key={day} style={[styles.day, { backgroundColor: colors.accent }]}>
                <Text variant="badge" color="onAccent">
                  {t(`weekdays.short.${day}`)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
      {/* Beside the card's button, not inside it, so VoiceOver reaches it too. */}
      <View style={styles.menu}>
        <MenuButton label={t('exercises.menu.label', { name: routine.name })} onPress={onMenu} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  // Leaves room on the right for ⋮.
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: touch.min + MENU_EDGE - inset.cardX,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  days: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  day: {
    width: DAY,
    height: DAY,
    borderRadius: DAY / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Centred on the card, so it stays level with the row (and the day
  // bubbles) when a long name takes two lines.
  menu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: MENU_EDGE,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
