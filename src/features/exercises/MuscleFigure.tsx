import { View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';

import { useTheme } from '@/theme';

import type { Muscle } from './vocabulary';

// Where each of our muscles is drawn on the body figure, and which side
// shows it best. The figure has no separate lats or abductors, so those
// use the nearest area (upper back, outer glutes).
const MUSCLE_AREAS: Record<Muscle, { slug: Slug; side: 'front' | 'back' }> = {
  chest: { slug: 'chest', side: 'front' },
  shoulders: { slug: 'deltoids', side: 'front' },
  biceps: { slug: 'biceps', side: 'front' },
  triceps: { slug: 'triceps', side: 'back' },
  forearms: { slug: 'forearm', side: 'front' },
  lats: { slug: 'upper-back', side: 'back' },
  upper_back: { slug: 'upper-back', side: 'back' },
  traps: { slug: 'trapezius', side: 'back' },
  lower_back: { slug: 'lower-back', side: 'back' },
  abs: { slug: 'abs', side: 'front' },
  obliques: { slug: 'obliques', side: 'front' },
  glutes: { slug: 'gluteal', side: 'back' },
  quads: { slug: 'quadriceps', side: 'front' },
  hamstrings: { slug: 'hamstring', side: 'back' },
  adductors: { slug: 'adductors', side: 'front' },
  abductors: { slug: 'gluteal', side: 'back' },
  calves: { slug: 'calves', side: 'back' },
};

// The figure is drawn 400 points tall at scale 1.
const FIGURE_HEIGHT = 400;

// A small body figure with one muscle highlighted in the accent colour.
// Decorative: the muscle name is always written next to it.
export function MuscleFigure({ muscle, height = 48 }: { muscle: Muscle; height?: number }) {
  const { colors } = useTheme();
  const { slug, side } = MUSCLE_AREAS[muscle];

  return (
    <View aria-hidden>
      <Body
        data={[{ slug, color: colors.accent }]}
        side={side}
        gender="female"
        scale={height / FIGURE_HEIGHT}
        border="none"
        defaultFill={colors.textMuted}
      />
    </View>
  );
}
