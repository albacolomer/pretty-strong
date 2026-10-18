import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { spacing } from '@/theme';

import { EXERCISE_NOTES_MAX_LENGTH } from './routine';

type ExerciseNoteFieldProps = {
  notes: string;
  // The exercise or block, so VoiceOver says which one the field is for.
  name: string;
  onChange: (notes: string) => void;
};

// This routine's note on an exercise or run block, e.g. "agafada ampla".
// "Afegeix una nota" until asked for, or straight away if there's a note.
export function ExerciseNoteField({ notes, name, onChange }: ExerciseNoteFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(notes !== '');

  if (!open) {
    return (
      <Button
        label={t('routines.editor.addExerciseNotes')}
        variant="ghost"
        onPress={() => setOpen(true)}
      />
    );
  }

  return (
    <TextField
      label={t('routines.editor.exerciseNotes')}
      // Several cards have this field: VoiceOver also says which one.
      aria-label={t('routines.editor.exerciseNotesFor', { name })}
      placeholder={t('routines.editor.exerciseNotesPlaceholder')}
      value={notes}
      onChangeText={onChange}
      // Only when just asked for, not when the routine opens.
      autoFocus={notes === ''}
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
