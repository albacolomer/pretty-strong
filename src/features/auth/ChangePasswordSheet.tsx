import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInputInstance } from 'react-native';

import { Sheet, Text, TextField, useToast } from '@/components/ui';

import { changePassword } from './api';
import { useAuth } from './AuthProvider';
import { authErrorReason, type AuthErrorReason } from './authErrors';
import { PASSWORD_MIN_LENGTH } from './validation';

// Settings → "Canvia la contrasenya": the current one, then the new one.
// It stays open until it's saved, and says what went wrong where.
export function ChangePasswordSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [currentWrong, setCurrentWrong] = useState(false);
  const [error, setError] = useState<AuthErrorReason | null>(null);
  const [saving, setSaving] = useState(false);
  const nextRef = useRef<TextInputInstance>(null);
  const ready = current !== '' && next.length >= PASSWORD_MIN_LENGTH && !saving;

  function close() {
    setCurrent('');
    setNext('');
    setCurrentWrong(false);
    setError(null);
    onClose();
  }

  async function save() {
    const email = session?.user.email;
    if (!ready || !email) return;
    setSaving(true);
    setCurrentWrong(false);
    setError(null);
    try {
      await changePassword(email, current, next);
      close();
      showToast({ message: t('settings.passwordChanged') });
    } catch (caught) {
      const reason = authErrorReason(caught);
      if (reason === 'invalidCredentials') setCurrentWrong(true);
      else setError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={t('settings.changePassword')}
      saveLabel={t('settings.save')}
      saveDisabled={!ready}
      onCancel={close}
      onSave={() => void save()}>
      <TextField
        label={t('settings.currentPassword')}
        value={current}
        onChangeText={(text) => {
          setCurrent(text);
          setCurrentWrong(false);
        }}
        error={currentWrong ? t('settings.currentPasswordWrong') : undefined}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        autoFocus
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => nextRef.current?.focus()}
      />
      <TextField
        ref={nextRef}
        label={t('settings.newPassword')}
        hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        value={next}
        onChangeText={(text) => {
          setNext(text);
          setError(null);
        }}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
      {error ? (
        <Text color="danger" role="alert">
          {t(`auth.errors.${error}`)}
        </Text>
      ) : null}
    </Sheet>
  );
}
