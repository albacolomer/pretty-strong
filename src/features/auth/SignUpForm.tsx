import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import { defaultLanguage, isLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import { isUsernameAvailable, signUp } from './api';
import { authErrorReason, type AuthErrorReason } from './authErrors';
import {
  hasErrors,
  normalizeUsername,
  PASSWORD_MIN_LENGTH,
  validateSignUp,
  type SignUpValues,
  type ValidationError,
} from './validation';

// Errors shown under a field: the form's own checks plus the ones only the
// server can know.
type FieldError = ValidationError | 'usernameTaken' | 'emailTaken' | 'weakPassword';
type FieldErrors = Partial<Record<keyof SignUpValues, FieldError>>;

export function SignUpForm() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthErrorReason | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const errorText = (error: FieldError | undefined) =>
    error && t(`auth.errors.${error}`, { min: PASSWORD_MIN_LENGTH });

  async function handleSubmit() {
    const errors = validateSignUp({ username, email, password });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    const normalizedUsername = normalizeUsername(username);
    setIsSubmitting(true);
    try {
      if (!(await isUsernameAvailable(normalizedUsername))) {
        setFieldErrors({ username: 'usernameTaken' });
        return;
      }
      const result = await signUp({
        username: normalizedUsername,
        email,
        password,
        language: isLanguage(i18n.language) ? i18n.language : defaultLanguage,
      });
      // With a session, the router swaps this screen for the tabs.
      setNeedsEmailConfirmation(result.needsEmailConfirmation);
    } catch (error) {
      const reason = authErrorReason(error);
      if (reason === 'emailTaken') setFieldErrors({ email: reason });
      else if (reason === 'weakPassword') setFieldErrors({ password: reason });
      else setFormError(reason);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsEmailConfirmation) {
    return <Text role="alert">{t('auth.signUp.checkEmail')}</Text>;
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t('auth.username')}
        hint={t('auth.usernameHint')}
        value={username}
        onChangeText={setUsername}
        error={errorText(fieldErrors.username)}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        // Not "username": iOS should pair the saved password with the email.
        textContentType="none"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={errorText(fieldErrors.email)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label={t('auth.password')}
        hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        value={password}
        onChangeText={setPassword}
        error={errorText(fieldErrors.password)}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {formError ? (
        <Text color="danger" role="alert">
          {t(`auth.errors.${formError}`)}
        </Text>
      ) : null}

      <Button label={t('auth.signUp.submit')} onPress={handleSubmit} disabled={isSubmitting} />
    </View>
  );
}
