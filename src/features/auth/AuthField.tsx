import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import { Text, Icon, type IconName } from '@/components/ui';
import { radius, spacing, touch, typography, useTheme } from '@/theme';

const HEIGHT = 58;

type AuthFieldProps = Omit<TextInputProps, 'secureTextEntry' | 'placeholder'> & {
  // Shown inside the empty field, and what VoiceOver says.
  label: string;
  icon: IconName;
  // A password: hidden, with an eye to show it.
  password?: boolean;
  // Already translated, under the field in red.
  error?: string;
  // Already translated, under the field when there's no error.
  hint?: string;
  ref?: Ref<TextInputInstance>;
};

// A field on sign-in and sign-up: a white pill raised off the sheet, its
// icon on the left, the label inside it until something is typed, and for
// a password an eye to show what's typed.
export function AuthField({
  label,
  icon,
  password = false,
  error,
  hint,
  ref,
  ...rest
}: AuthFieldProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const [shown, setShown] = useState(false);

  return (
    <View style={styles.field}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.surface,
            boxShadow: shadows.control,
            borderColor: error ? colors.danger : 'transparent',
          },
        ]}>
        <Icon name={icon} size={18} weight="regular" tintColor={colors.textMuted} />
        <TextInput
          ref={ref}
          aria-label={label}
          placeholder={label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          secureTextEntry={password && !shown}
          style={[styles.input, { color: colors.text }]}
          {...rest}
        />
        {password ? (
          <Pressable
            role="button"
            aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
            onPress={() => setShown(!shown)}
            hitSlop={(touch.min - 24) / 2}
            style={({ pressed }) => pressed && styles.pressed}>
            <Icon
              name={shown ? 'eye.slash' : 'eye'}
              size={18}
              weight="regular"
              tintColor={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={styles.below}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={styles.below}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: HEIGHT,
    paddingHorizontal: spacing.lg + spacing.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  // Only the font and size: a lineHeight would push the text off-centre
  // in iOS inputs.
  input: {
    flex: 1,
    minHeight: HEIGHT,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  below: {
    paddingHorizontal: spacing.lg + spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
