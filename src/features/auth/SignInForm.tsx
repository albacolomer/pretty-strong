import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import { spacing } from '@/theme';

import { signIn } from './api';
import { authErrorReason, type AuthErrorReason } from './authErrors';
import { hasErrors, validateSignIn, type SignInErrors } from './validation';

export function SignInForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInErrors>({});
  const [formError, setFormError] = useState<AuthErrorReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

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
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t('auth.email')}
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
      <TextField
        ref={passwordRef}
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password && t(`auth.errors.${fieldErrors.password}`)}
        secureTextEntry
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

      <Button label={t('auth.signIn.submit')} onPress={handleSubmit} disabled={isSubmitting} />
    </View>
  );
}
