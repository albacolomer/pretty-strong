import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, MenuHost, Text, Icon, PageSheet } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { exerciseName, type Exercise } from './exercise';
import { ExerciseFilterBar, useExerciseSearch } from './ExerciseFilterBar';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseRow } from './ExerciseRow';
import { NO_FILTERS } from './searchExercises';
import { useExercises } from './useExercises';

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  // The picked exercises' ids, in the order they were picked. One can come
  // more than once (HYROX: run, ski, run, row…).
  onAdd: (exerciseIds: string[]) => void;
  // Picks one exercise to swap in (mid-workout), instead of adding several.
  single?: boolean;
  // Once the sheet has finished closing (iOS), e.g. to show another menu.
  onDismissed?: () => void;
};

// A sheet to pick one or more exercises from the library (spec: "Exercise
// picker"), with the same search and filters. A missing exercise can be
// created right here (US-04). Used by the routine editor, the workout and
// past workouts. Adding, each tap on a row adds it once more, so one can
// be repeated (US-07); the strip above the buttons lists the picks in
// order and takes one out. Swapping, a row is ticked and unticked.
export function ExercisePicker({
  visible,
  onClose,
  onAdd,
  single = false,
  onDismissed,
}: ExercisePickerProps) {
  const { colors } = useTheme();

  return (
    <PageSheet
      visible={visible}
      onRequestClose={onClose}
      onDismiss={onDismissed}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Only mounted while open, so search and ticks start fresh each time. */}
        {visible ? <PickerContent onClose={onClose} onAdd={onAdd} single={single} /> : null}
        {/* Menus opened while this sheet is up appear on it. */}
        <MenuHost />
      </View>
    </PageSheet>
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

  function pick(id: string) {
    setSelected((current) => {
      if (!single) return [...current, id];
      return current.includes(id) ? [] : [id];
    });
  }

  function unpick(position: number) {
    setSelected((current) => current.filter((_, index) => index !== position));
  }

  // Back to the list, searching for the new exercise so it shows, ticked.
  function handleCreated(exercise: Exercise) {
    search.setFilters({
      ...NO_FILTERS,
      query: exerciseName(exercise, language),
    });
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
        {!creating && !single ? (
          <Text variant="caption" color="textMuted">
            {t('exercises.picker.repeatHint')}
          </Text>
        ) : null}
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
                  const count = selected.filter((id) => id === exercise.id).length;
                  return (
                    <ExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      language={language}
                      separator={index > 0}
                      // Swapping, a checkbox; adding, a button that adds it again.
                      selected={single ? count > 0 : undefined}
                      onPress={() => pick(exercise.id)}
                      accessory={<CountBadge count={count} announce={!single} />}
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
            {!single && selected.length > 0 ? (
              <PickedStrip
                picked={selected.map((id) => {
                  const exercise = exercises.find((item) => item.id === id);
                  return exercise ? exerciseName(exercise, language) : '';
                })}
                onRemove={unpick}
              />
            ) : null}
            <View style={styles.buttons}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.footerButton}
              />
              <Button
                label={
                  single
                    ? t('exercises.picker.swap')
                    : t('exercises.picker.add', { count: selected.length })
                }
                onPress={() => onAdd(selected)}
                disabled={selected.length === 0}
                style={styles.footerButton}
              />
            </View>
          </>
        )}
      </View>
    </>
  );
}

// The picks in order, e.g. "1 Córrer · 2 SkiErg · 3 Córrer"; a tap takes
// that one out. It follows the newest pick.
function PickedStrip({
  picked,
  onRemove,
}: {
  picked: readonly string[];
  onRemove: (position: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const strip = useRef<ScrollViewInstance>(null);

  return (
    <ScrollView
      ref={strip}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      onContentSizeChange={() => strip.current?.scrollToEnd()}>
      {picked.map((name, index) => (
        <Pressable
          // The same exercise can be here twice: the position tells them apart.
          key={`${index}-${name}`}
          role="button"
          aria-label={t('exercises.picker.removePicked', {
            name,
            position: index + 1,
          })}
          onPress={() => onRemove(index)}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: colors.surfaceRaised },
            pressed && styles.pressed,
          ]}>
          <Text variant="captionMedium" color="accent">
            {index + 1}
          </Text>
          <Text variant="captionMedium" numberOfLines={1} style={styles.chipName}>
            {name}
          </Text>
          <Icon name="xmark" size={11} weight="semibold" tintColor={colors.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

// How many times a row has been picked: an empty ring, a tick, or ×2, ×3…
// Adding, screen readers hear it ("Afegit 2 cops"); swapping, the row
// already says whether it's ticked.
function CountBadge({ count, announce }: { count: number; announce: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ticked = count > 0;
  const heard = announce && ticked;

  return (
    <View
      aria-hidden={!heard}
      aria-label={heard ? t('exercises.picker.timesAdded', { count }) : undefined}
      style={[
        styles.badge,
        ticked
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { borderColor: colors.textMuted },
      ]}>
      {count === 1 ? (
        <Icon name="checkmark" size={13} weight="bold" tintColor={colors.onAccent} />
      ) : count > 1 ? (
        <Text variant="caption" color="onAccent">
          {`×${count}`}
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  strip: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  // A long custom name doesn't push the rest of the strip away.
  chipName: {
    maxWidth: 160,
  },
  pressed: {
    opacity: 0.75,
  },
  footerButton: {
    flex: 1,
  },
});
