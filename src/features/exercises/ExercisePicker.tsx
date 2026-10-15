import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { ExerciseFilterBar, useExerciseSearch } from './ExerciseFilterBar';
import { ExerciseRow } from './ExerciseRow';
import { useExercises } from './useExercises';

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  // The ticked exercises' ids, in the order they were ticked.
  onAdd: (exerciseIds: string[]) => void;
};

// A sheet to pick one or more exercises from the library (spec: "Exercise
// picker"), with the same search and filters. Used by the routine editor
// now and by workouts later.
export function ExercisePicker({ visible, onClose, onAdd }: ExercisePickerProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Only mounted while open, so search and ticks start fresh each time. */}
        {visible ? <PickerContent onClose={onClose} onAdd={onAdd} /> : null}
      </View>
    </Modal>
  );
}

function PickerContent({ onClose, onAdd }: Omit<ExercisePickerProps, 'visible'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const { data: exercises = [], isPending } = useExercises();
  const search = useExerciseSearch(exercises);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <>
      <View style={styles.header}>
        <View style={[styles.grabber, { backgroundColor: colors.surfaceRaised }]} />
        <Text variant="cardTitle" accessibilityRole="header">
          {t('exercises.picker.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <ExerciseFilterBar exercises={exercises} search={search} />
            {search.results.length === 0 ? (
              <Text color="textMuted">{t('exercises.noResults')}</Text>
            ) : (
              <Card style={styles.list}>
                {search.results.map((exercise) => {
                  const order = selected.indexOf(exercise.id);
                  return (
                    <ExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      language={language}
                      selected={order !== -1}
                      onPress={() => toggle(exercise.id)}
                      accessory={<OrderBadge order={order} />}
                    />
                  );
                })}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.surfaceRaised, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={styles.footerButton}
        />
        <Button
          label={t('exercises.picker.add', { count: selected.length })}
          onPress={() => onAdd(selected)}
          disabled={selected.length === 0}
          style={styles.footerButton}
        />
      </View>
    </>
  );
}

// 1, 2, 3… in the order exercises were ticked; an empty ring otherwise.
// Decorative: the row already says whether it's ticked.
function OrderBadge({ order }: { order: number }) {
  const { colors } = useTheme();
  const ticked = order !== -1;

  return (
    <View
      aria-hidden
      style={[
        styles.badge,
        ticked
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { borderColor: colors.textMuted },
      ]}>
      {ticked ? (
        <Text variant="caption" color="onAccent">
          {order + 1}
        </Text>
      ) : null}
    </View>
  );
}

const BADGE_SIZE = 28;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
});
