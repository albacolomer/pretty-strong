import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button, Text } from '@/components/ui';
import { spacing } from '@/theme';

import { signIn } from './api';
import { AuthField } from './AuthField';
import { authErrorReason, type AuthErrorReason } from './authErrors';
import { hasErrors, validateSignIn, type SignInErrors } from './validation';

export function SignInForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInErrors>({});
  const [formError, setFormError] = useState<AuthErrorReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function handleSubmit() {
    const errors = validateSignIn({ email, password });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      // On success the router swaps this screen for the tabs.
    } catch (error) {
      setFormError(authErrorReason(error));
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <AuthField
        label={t('auth.email')}
        icon="envelope"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email && t(`auth.errors.${fieldErrors.email}`)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        // "username" is what iOS looks for to offer saved passwords.
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
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password && t(`auth.errors.${fieldErrors.password}`)}
        autoComplete="current-password"
        textContentType="password"
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
        label={t('auth.signIn.submit')}
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
