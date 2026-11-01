import MaskedViewClass from '@react-native-masked-view/masked-view';
import type { ComponentType, ReactElement } from 'react';
import { StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import type { GradientName } from '@/theme';

import { GradientView } from './GradientView';
import { Text, type TextProps } from './Text';

// The library's types are built on React Native's old ones, and with
// today's TypeScript they don't read as a component. It is a view with a
// maskElement.
const MaskedView = MaskedViewClass as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

export type GradientTextProps = Omit<TextProps, 'color'> & {
  // The steel heading gradient unless said.
  gradient?: GradientName;
  // The box the gradient fills. It fits the text, unless the parent
  // stretches it: then give it an alignSelf (as the design does), or the
  // gradient spreads over the whole width.
  containerStyle?: StyleProp<ViewStyle>;
};

// Text painted with a gradient (CSS background-clip: text). The text is
// a stencil (the mask) over a gradient its own size. Under the stencil,
// the same text in a clear colour gives the gradient that size, and it's
// the copy VoiceOver reads; the stencil copy is hidden from it.
export function GradientText({
  gradient = 'metalText',
  containerStyle,
  variant,
  style,
  numberOfLines,
  children,
  ...rest
}: GradientTextProps) {
  return (
    <MaskedView
      style={containerStyle}
      maskElement={
        <Text variant={variant} style={style} numberOfLines={numberOfLines} aria-hidden>
          {children}
        </Text>
      }>
      <GradientView gradient={gradient}>
        <Text
          variant={variant}
          style={[style, styles.clear]}
          numberOfLines={numberOfLines}
          {...rest}>
          {children}
        </Text>
      </GradientView>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  clear: {
    color: 'transparent',
  },
});
