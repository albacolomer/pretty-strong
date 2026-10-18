import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { spacing } from '@/theme';

import { EXERCISE_NOTES_MAX_LENGTH } from './routine';

// "+ Nota": opens this routine's note on an exercise or run block. `name`
// tells VoiceOver which one.
export function AddNoteButton({ name, onPress }: { name: string; onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Button
      label={t('routines.editor.addNoteShort')}
      aria-label={t('routines.editor.addExerciseNotes', { name })}
      variant="ghost"
      onPress={onPress}
    />
  );
}

type ExerciseNoteInputProps = {
  notes: string;
  name: string;
  onChange: (notes: string) => void;
  // When just opened with "+ Nota", not when the routine opens with a note.
  autoFocus: boolean;
};

// This routine's note on an exercise or run block, e.g. "agafada ampla".
export function ExerciseNoteInput({ notes, name, onChange, autoFocus }: ExerciseNoteInputProps) {
  const { t } = useTranslation();

  return (
    <TextField
      label={t('routines.editor.exerciseNotes')}
      // Several cards have this field: VoiceOver also says which one.
      aria-label={t('routines.editor.exerciseNotesFor', { name })}
      placeholder={t('routines.editor.exerciseNotesPlaceholder')}
      value={notes}
      onChangeText={onChange}
      autoFocus={autoFocus}
      multiline
      maxLength={EXERCISE_NOTES_MAX_LENGTH}
      style={styles.notes}
    />
  );
}

const styles = StyleSheet.create({
  notes: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
