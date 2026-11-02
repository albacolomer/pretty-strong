import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Sheet, Text } from '@/components/ui';
import type { Routine } from '@/features/routines/routine';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
import { useRoutineSummary } from '@/features/routines/useRoutineSummary';
import { radius, spacing, touch, useTheme } from '@/theme';

type RoutinePickerSheetProps = {
  visible: boolean;
  title: string;
  routines: Routine[];
  // A routine tapped. The sheet stays open (e.g. while a swap asks why);
  // the caller closes it.
  onPick: (routine: Routine) => void;
  onClose: () => void;
  // When given, "+ Crea una rutina nova" after the list.
  onCreate?: () => void;
};

const ICON = 40;

// Choose a routine (Canvia → "Una altra rutina", + → "Una rutina"): one row
// each, with its type's icon, its name and what's in it, as in Pla.
export function RoutinePickerSheet({
  visible,
  title,
  routines,
  onPick,
  onClose,
  onCreate,
}: RoutinePickerSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Sheet visible={visible} title={title} onCancel={onClose}>
      <Card style={styles.list}>
        {routines.map((routine, index) => (
          <RoutineOption
            key={routine.id}
            routine={routine}
            separator={index > 0}
            onPress={() => onPick(routine)}
          />
        ))}
        {onCreate ? (
          <Pressable
            role="button"
            onPress={onCreate}
            style={({ pressed }) => [
              styles.row,
              routines.length > 0 && { borderTopWidth: 1, borderTopColor: colors.separator },
              pressed && styles.pressed,
            ]}>
            <View style={styles.icon}>
              <SymbolView name="plus" size={18} weight="medium" tintColor={colors.accent} />
            </View>
            <Text variant="label" color="accent" style={styles.text}>
              {t('workout.newRoutine')}
            </Text>
          </Pressable>
        ) : null}
      </Card>
    </Sheet>
  );
}

function RoutineOption({
  routine,
  separator,
  onPress,
}: {
  routine: Routine;
  separator: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const summary = useRoutineSummary(routine);

  return (
    <Pressable
      role="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        separator && { borderTopWidth: 1, borderTopColor: colors.separator },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <SymbolView
          name={ROUTINE_ICONS[routine.label]}
          size={20}
          weight="light"
          tintColor={colors.accent}
        />
      </View>
      <View style={styles.text}>
        <Text variant="name" numberOfLines={1}>
          {routine.name}
        </Text>
        {summary !== '' ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
      </View>
      <SymbolView name="chevron.right" size={12} weight="light" tintColor={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The rows bring their own padding and hairlines.
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.check + spacing.md,
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
  pressed: {
    opacity: 0.75,
  },
});
