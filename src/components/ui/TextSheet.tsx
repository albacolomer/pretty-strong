import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, type KeyboardTypeOptions } from 'react-native';

import { spacing } from '@/theme';

import { Sheet } from './Sheet';
import { TextField } from './TextField';

type TextSheetProps = {
  visible: boolean;
  title: string;
  // What VoiceOver calls the field; the title already shows it.
  label: string;
  placeholder?: string;
  value: string;
  onClose: () => void;
  // What's typed; it's saved with the rest of the form.
  onDone: (text: string) => void;
  // An already translated message when what's typed can't be kept.
  validate?: (text: string) => string | undefined;
  // A note: several lines. A link: one line, typed as is.
  kind?: 'note' | 'link';
  maxLength?: number;
};

// One text written in a sheet from a settings row: a note, a link. Fet
// keeps what's typed; Cancel·la goes back to it as it was.
export function TextSheet({
  visible,
  title,
  label,
  placeholder,
  value,
  onClose,
  onDone,
  validate,
  kind = 'note',
  maxLength = 1000,
}: TextSheetProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [error, setError] = useState<string>();
  // Each time it opens, it starts from the value as it is then (a saved
  // note may only arrive after the form has opened).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setText(value);
      setError(undefined);
    }
  }
  const link = kind === 'link';
  const keyboardType: KeyboardTypeOptions = link ? 'url' : 'default';

  return (
    <Sheet
      visible={visible}
      title={title}
      saveLabel={t('common.done')}
      onSave={() => {
        const found = validate?.(text);
        setError(found);
        if (!found) onDone(text);
      }}
      onCancel={onClose}>
      <TextField
        label={label}
        labelHidden
        placeholder={placeholder}
        value={text}
        onChangeText={(next) => {
          setText(next);
          setError(undefined);
        }}
        error={error}
        autoFocus
        multiline={!link}
        keyboardType={keyboardType}
        autoCapitalize={link ? 'none' : 'sentences'}
        autoCorrect={!link}
        maxLength={maxLength}
        style={link ? undefined : styles.note}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: {
    minHeight: 120,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
});
