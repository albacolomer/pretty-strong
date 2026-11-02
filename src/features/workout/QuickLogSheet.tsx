import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, MenuHost, NumberInput, Text, TextField } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

import { readMinutes } from './session';

export type QuickLog = {
  durationS: number | null;
  notes: string | null;
};

type QuickLogSheetProps = {
  visible: boolean;
  routineName: string;
  // Filled in from the plan, e.g. 50 minutes for a class.
  plannedDurationS: number | null;
  onCancel: () => void;
  onSave: (log: QuickLog) => void;
};

// "Fet" on Today (US-20): how long it took and an optional note, then it's
// logged as done. Exercises and results can be added later from History.
export function QuickLogSheet({ visible, ...props }: QuickLogSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onCancel}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Only mounted while open, so it starts from the plan each time. */}
        {visible ? <SheetContent {...props} /> : null}
        {/* Menus opened while this sheet is up appear on it. */}
        <MenuHost />
      </View>
    </Modal>
  );
}

function SheetContent({
  routineName,
  plannedDurationS,
  onCancel,
  onSave,
}: Omit<QuickLogSheetProps, 'visible'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(
    plannedDurationS === null ? '' : String(Math.round(plannedDurationS / 60)),
  );
  const [notes, setNotes] = useState('');

  return (
    <>
      <View style={styles.header}>
        <View style={[styles.grabber, { backgroundColor: colors.control }]} />
        <Text variant="cardTitle" accessibilityRole="header">
          {t('workout.quickLog.title', { name: routineName })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NumberInput
          label={t('workout.quickLog.duration')}
          value={minutes}
          onChangeText={setMinutes}
          maxLength={4}
          style={styles.minutes}
        />
        <TextField
          label={t('workout.quickLog.notes')}
          placeholder={t('workout.quickLog.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
          style={styles.notes}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.separator, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onCancel}
          style={styles.footerButton}
        />
        <Button
          label={t('workout.quickLog.save')}
          onPress={() =>
            onSave({ durationS: readMinutes(minutes), notes: notes.trim() === '' ? null : notes.trim() })
          }
          style={styles.footerButton}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
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
  minutes: {
    alignSelf: 'flex-start',
    width: 120,
  },
  notes: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
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
