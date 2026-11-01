import { StyleSheet, View } from 'react-native';

import { GradientText } from './GradientText';
import { Text } from './Text';

export type ScreenTitleProps = {
  title: string;
  // A line over it, e.g. the date on Avui.
  eyebrow?: string;
};

// A screen's title in big steel-gradient italic capitals, as on Avui.
export function ScreenTitle({ title, eyebrow }: ScreenTitleProps) {
  return (
    <View>
      {eyebrow ? (
        <Text variant="eyebrow" color="textMuted">
          {eyebrow}
        </Text>
      ) : null}
      <GradientText
        variant="screenTitle"
        accessibilityRole="header"
        style={styles.text}
        containerStyle={styles.box}>
        {title}
      </GradientText>
    </View>
  );
}

const styles = StyleSheet.create({
  // The gradient fits the word, as in the design.
  box: {
    alignSelf: 'flex-start',
  },
  // Italic capitals lean past their box; without this the last one's tip
  // would fall outside the gradient.
  text: {
    paddingRight: 4,
  },
});
