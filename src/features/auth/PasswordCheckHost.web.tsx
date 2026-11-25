import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sheet, Text, TextField } from '@/components/ui';

import { checkPassword } from './api';
import { useAuth } from './AuthProvider';
import { authErrorReason, type AuthErrorReason } from './authErrors';
import { setPasswordCheckHost, type PasswordQuestion } from './passwordCheck';

// The web's stand-in for Face ID: a sheet that asks for the account's
// password and answers once it's right. Mounted once, at the root.
export function PasswordCheckHost() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [question, setQuestion] = useState<PasswordQuestion | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthErrorReason | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(
    () =>
      setPasswordCheckHost((next) => {
        setPassword('');
        setError(null);
        setQuestion(next);
      }),
    [],
  );

  function close(ok: boolean) {
    question?.answer(ok);
    setQuestion(null);
    setPassword('');
    setError(null);
  }

  async function check() {
    const email = session?.user.email;
    if (!email || password === '' || checking) return;
    setChecking(true);
    setError(null);
    try {
      await checkPassword(email, password);
      close(true);
    } catch (caught) {
      setError(authErrorReason(caught));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Sheet
      visible={question !== null}
      title={question?.title ?? ''}
      cancelLabel={question?.cancelLabel}
      onCancel={() => close(false)}
      saveLabel={t('auth.checkPassword.submit')}
      saveDisabled={password === '' || checking}
      onSave={() => void check()}>
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        error={error === 'invalidCredentials' ? t('auth.checkPassword.wrong') : undefined}
        secureTextEntry
        autoComplete="current-password"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void check()}
      />
      {error && error !== 'invalidCredentials' ? (
        <Text color="danger" role="alert">
          {t(`auth.errors.${error}`)}
        </Text>
      ) : null}
    </Sheet>
  );
}
