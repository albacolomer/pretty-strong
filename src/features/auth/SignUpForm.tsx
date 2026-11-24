import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useSetupStore } from '@/features/onboarding/setupStore';
import { appLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import { isUsernameAvailable, signUp } from './api';
import { AuthField } from './AuthField';
import { authErrorReason, type AuthErrorReason } from './authErrors';
import {
  hasErrors,
  PASSWORD_MIN_LENGTH,
  usernameCandidates,
  validateSignUp,
  type SignUpValues,
  type ValidationError,
} from './validation';

// Errors shown under a field: the form's own checks plus the ones only the
// server can know.
type FieldError = ValidationError | 'emailTaken' | 'weakPassword';

// The first free username made from the email; none if all are taken (the
// database then makes one up). It can be changed in the setup straight
// after.
async function freeUsername(email: string): Promise<string | undefined> {
  for (const candidate of usernameCandidates(email)) {
    if (await isUsernameAvailable(candidate)) return candidate;
  }
  return undefined;
}
type FieldErrors = Partial<Record<keyof SignUpValues, FieldError>>;

// Just an email and a password, typed twice: everything else is asked in
// the setup that follows (US-01).
export function SignUpForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthErrorReason | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const beginSetup = useSetupStore((state) => state.begin);
  const cancelSetup = useSetupStore((state) => state.finish);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const errorText = (error: FieldError | undefined) =>
    error && t(`auth.errors.${error}`, { min: PASSWORD_MIN_LENGTH });

  async function handleSubmit() {
    const errors = validateSignUp({ email, password, confirmPassword });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const username = await freeUsername(email);
      // Before the account exists: its session arrives while signUp is
      // still running, and must go straight to the setup, not the tabs.
      beginSetup(email);
      const result = await signUp({
        username,
        email,
        password,
        language: appLanguage(),
      });
      // With a session, the router swaps this screen for the setup.
      setNeedsEmailConfirmation(result.needsEmailConfirmation);
    } catch (error) {
      cancelSetup();
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
    <View style={styles.form}>
      <AuthField
        label={t('auth.email')}
        icon="envelope"
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
      <AuthField
        ref={passwordRef}
        label={t('auth.password')}
        icon="lock"
        password
        hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        value={password}
        onChangeText={setPassword}
        error={errorText(fieldErrors.password)}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <AuthField
        ref={confirmRef}
        label={t('auth.confirmPassword')}
        icon="lock"
        password
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errorText(fieldErrors.confirmPassword)}
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

      {/* The button at the bottom, in reach of the thumb. */}
      <View style={styles.spacer} />
      <Button
        label={t('auth.signUp.submit')}
        caps
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    flexGrow: 1,
    gap: spacing.md,
  },
  spacer: {
    flexGrow: 1,
    minHeight: spacing.lg,
  },
  submit: {
    minHeight: 58,
  },
});
