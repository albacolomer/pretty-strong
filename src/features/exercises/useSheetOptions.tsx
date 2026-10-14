import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { EquipmentIcon } from './EquipmentIcon';
import { MuscleFigure } from './MuscleFigure';
import type { SheetGroup } from './OptionSheet';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Muscle } from './vocabulary';

// Muscles grouped into upper body, core and lower body, each with its body
// figure. `include` leaves options out, e.g. ones no exercise uses; empty
// groups are dropped.
export function useMuscleGroups(include: (muscle: Muscle) => boolean = () => true) {
  const { t } = useTranslation();

  return MUSCLE_GROUPS.map(
    (group): SheetGroup<Muscle> => ({
      title: t(`exercises.groups.${group.key}`),
      options: group.muscles.filter(include).map((muscle) => ({
        value: muscle,
        label: t(`muscles.${muscle}`),
        icon: <MuscleFigure muscle={muscle} />,
      })),
    }),
  ).filter((group) => group.options.length > 0);
}

// All equipment in one group, each with its icon.
export function useEquipmentGroups(include: (item: Equipment) => boolean = () => true) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const group: SheetGroup<Equipment> = {
    options: EQUIPMENT.filter(include).map((item) => ({
      value: item,
      label: t(`equipment.${item}`),
      icon: <EquipmentIcon equipment={item} color={colors.accent} />,
    })),
  };
  return [group];
}
