import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Sheet, TextField } from '@/components/ui';
import { spacing } from '@/theme';

type RoutineNoteSheetProps = {
  visible: boolean;
  note: string;
  onClose: () => void;
  // The note as typed; it's saved with the routine.
  onDone: (note: string) => void;
};

// The routine's note, written in a sheet from the Nota row. Fet keeps
// what's typed; Cancel·la goes back to the note as it was.
export function RoutineNoteSheet({ visible, note, onClose, onDone }: RoutineNoteSheetProps) {
  const { t } = useTranslation();
  // The note only changes through here, so this stays in step with it.
  const [text, setText] = useState(note);

  return (
    <Sheet
      visible={visible}
      title={t('routines.editor.notes')}
      saveLabel={t('common.done')}
      onSave={() => onDone(text)}
      onCancel={() => {
        setText(note);
        onClose();
      }}>
      <TextField
        label={t('routines.editor.notes')}
        labelHidden
        placeholder={t('routines.editor.notesPlaceholder')}
        value={text}
        onChangeText={setText}
        autoFocus
        multiline
        maxLength={1000}
        style={styles.notes}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  notes: {
    minHeight: 120,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
});
