import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

// The drawing is 100 wide and 60 tall (it sits on a 100×100 grid, cropped
// to the dumbbell), so the height is always 60% of the width.
const ASPECT_RATIO = 0.6;

const HEART =
  'M50 62.46 C41.04 56.06 35.92 50.94 35.92 45.18 C35.92 40.7 39.12 37.5 43.28 37.5 ' +
  'C46.16 37.5 48.4 39.1 50 41.66 C51.6 39.1 53.84 37.5 56.72 37.5 ' +
  'C60.88 37.5 64.08 40.7 64.08 45.18 C64.08 50.94 58.96 56.06 50 62.46 Z';

export type LogoProps = {
  width?: number;
};

// Pretty Strong logo: a dumbbell with a heart in the middle of the bar.
// Decorative, so screen readers skip it; the app name is written next to it.
export function Logo({ width = 120 }: LogoProps) {
  const { colors } = useTheme();
  const fill = colors.accent;

  return (
    <Svg width={width} height={width * ASPECT_RATIO} viewBox="0 20 100 60" aria-hidden>
      <Rect x={6} y={34} width={10} height={32} rx={5} fill={fill} />
      <Rect x={18} y={23} width={12} height={54} rx={6} fill={fill} />
      <Rect x={29} y={45.5} width={42} height={9} rx={4.5} fill={fill} />
      <Rect x={70} y={23} width={12} height={54} rx={6} fill={fill} />
      <Rect x={84} y={34} width={10} height={32} rx={5} fill={fill} />
      <Path d={HEART} fill={fill} />
    </Svg>
  );
}
