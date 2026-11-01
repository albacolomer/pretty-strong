import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { exerciseName, type Exercise } from './exercise';
import { ExerciseFilterBar, useExerciseSearch } from './ExerciseFilterBar';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseRow } from './ExerciseRow';
import { NO_FILTERS } from './searchExercises';
import { useExercises } from './useExercises';

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  // The ticked exercises' ids, in the order they were ticked.
  onAdd: (exerciseIds: string[]) => void;
  // Picks one exercise to swap in (mid-workout), instead of adding several.
  single?: boolean;
  // Once the sheet has finished closing (iOS), e.g. to show another menu.
  onDismissed?: () => void;
};

// A sheet to pick one or more exercises from the library (spec: "Exercise
// picker"), with the same search and filters. A missing exercise can be
// created right here (US-04). Used by the routine editor now and by
// workouts later.
export function ExercisePicker({
  visible,
  onClose,
  onAdd,
  single = false,
  onDismissed,
}: ExercisePickerProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismissed}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Only mounted while open, so search and ticks start fresh each time. */}
        {visible ? <PickerContent onClose={onClose} onAdd={onAdd} single={single} /> : null}
      </View>
    </Modal>
  );
}

function PickerContent({ onClose, onAdd, single = false }: Omit<ExercisePickerProps, 'visible'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const { data: exercises = [], isPending } = useExercises();
  const search = useExerciseSearch(exercises);
  const [selected, setSelected] = useState<string[]>([]);
  // Null while picking; while creating an exercise, the name it starts with.
  const [newName, setNewName] = useState<string | null>(null);
  const creating = newName !== null;

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return single ? [id] : [...current, id];
    });
  }

  // Back to the list, searching for the new exercise so it shows, ticked.
  function handleCreated(exercise: Exercise) {
    search.setFilters({ ...NO_FILTERS, query: exerciseName(exercise, language) });
    setSelected((current) => (single ? [exercise.id] : [...current, exercise.id]));
    setNewName(null);
  }

  return (
    <>
      <View style={styles.header}>
        <View style={[styles.grabber, { backgroundColor: colors.control }]} />
        <Text variant="cardTitle" accessibilityRole="header">
          {creating
            ? t('exercises.form.title')
            : single
              ? t('exercises.picker.swapTitle')
              : t('exercises.picker.title')}
        </Text>
      </View>

      <ScrollView
        // A new key starts the form, and the list again, scrolled to the top.
        key={creating ? 'form' : 'list'}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {creating ? (
          <ExerciseForm initialName={newName} onSaved={handleCreated} />
        ) : isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <ExerciseFilterBar
              exercises={exercises}
              search={search}
              onCreate={() => setNewName('')}
            />
            {search.results.length === 0 ? (
              <View style={styles.empty}>
                <Text color="textMuted">{t('exercises.noResults')}</Text>
                {search.query !== '' ? (
                  // Not in the library? Create it with the searched name.
                  <Button
                    label={t('exercises.createNamed', { name: search.query })}
                    onPress={() => setNewName(search.query)}
                  />
                ) : null}
              </View>
            ) : (
              <Card style={styles.list}>
                {search.results.map((exercise, index) => {
                  const order = selected.indexOf(exercise.id);
                  return (
                    <ExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      language={language}
                      separator={index > 0}
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
          { borderTopColor: colors.separator, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        {creating ? (
          // The form has its own save button; this one drops the new exercise.
          <Button
            label={t('exercises.picker.backToList')}
            variant="secondary"
            onPress={() => setNewName(null)}
            style={styles.footerButton}
          />
        ) : (
          <>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={onClose}
              style={styles.footerButton}
            />
            <Button
              label={
                single ? t('exercises.picker.swap') : t('exercises.picker.add', { count: selected.length })
              }
              onPress={() => onAdd(selected)}
              disabled={selected.length === 0}
              style={styles.footerButton}
            />
          </>
        )}
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
  // The rows bring their own padding and hairlines.
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 0,
  },
  empty: {
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
