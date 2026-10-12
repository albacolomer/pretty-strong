import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type ColorToken, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
};

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();

  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
