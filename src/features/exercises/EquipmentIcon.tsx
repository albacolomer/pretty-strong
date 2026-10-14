import { SvgXml } from 'react-native-svg';

import { EQUIPMENT_ICONS } from './equipmentIcons';
import type { Equipment } from './vocabulary';

type EquipmentIconProps = {
  equipment: Equipment;
  color: string;
  size?: number;
};

// Decorative: the equipment name is always written next to it.
export function EquipmentIcon({ equipment, color, size = 32 }: EquipmentIconProps) {
  const xml = `<svg viewBox="0 0 48 48">${EQUIPMENT_ICONS[equipment]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color} aria-hidden />;
}
