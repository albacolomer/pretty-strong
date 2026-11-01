import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { cssGradientPoints, useTheme } from '@/theme';

// The drawing is 100 wide and 60 tall (it sits on a 100×100 grid, cropped
// to the dumbbell), so the height is always 60% of the width.
const ASPECT_RATIO = 0.6;
const BOX = { x: 0, y: 20, width: 100, height: 60 };
const GRADIENT_ID = 'logoMetal';

const HEART =
  'M50 62.46 C41.04 56.06 35.92 50.94 35.92 45.18 C35.92 40.7 39.12 37.5 43.28 37.5 ' +
  'C46.16 37.5 48.4 39.1 50 41.66 C51.6 39.1 53.84 37.5 56.72 37.5 ' +
  'C60.88 37.5 64.08 40.7 64.08 45.18 C64.08 50.94 58.96 56.06 50 62.46 Z';

export type LogoProps = {
  width?: number;
};

// Pretty Strong logo: a dumbbell with a heart in the middle of the bar, in
// brushed metal like the GO button. One gradient spans the whole drawing
// (userSpaceOnUse), so it reads as one piece of metal, not each part shaded
// on its own. Decorative, so screen readers skip it; the app name is
// written next to it.
export function Logo({ width = 120 }: LogoProps) {
  const { gradients } = useTheme();
  const metal = gradients.metal;
  const { start, end } = cssGradientPoints(metal.angle, BOX.width, BOX.height);
  const fill = `url(#${GRADIENT_ID})`;

  return (
    <Svg width={width} height={width * ASPECT_RATIO} viewBox="0 20 100 60" aria-hidden>
      <Defs>
        <LinearGradient
          id={GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          x1={BOX.x + start.x * BOX.width}
          y1={BOX.y + start.y * BOX.height}
          x2={BOX.x + end.x * BOX.width}
          y2={BOX.y + end.y * BOX.height}>
          {metal.colors.map((color, index) => (
            <Stop key={color} offset={metal.locations[index]} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={6} y={34} width={10} height={32} rx={5} fill={fill} />
      <Rect x={18} y={23} width={12} height={54} rx={6} fill={fill} />
      <Rect x={29} y={45.5} width={42} height={9} rx={4.5} fill={fill} />
      <Rect x={70} y={23} width={12} height={54} rx={6} fill={fill} />
      <Rect x={84} y={34} width={10} height={32} rx={5} fill={fill} />
      <Path d={HEART} fill={fill} />
    </Svg>
  );
}
