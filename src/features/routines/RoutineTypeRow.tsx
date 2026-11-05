import { useTranslation } from 'react-i18next';

import { SettingsRow, useActionSheet } from '@/components/ui';

import { ROUTINE_LABELS, type RoutineLabel } from './routine';
import { ROUTINE_ICONS } from './routineIcons';

type RoutineTypeRowProps = {
  value: RoutineLabel;
  onChange: (label: RoutineLabel) => void;
};

// "Tipus · Força ›", with the type's icon: opens the native list of types.
export function RoutineTypeRow({ value, onChange }: RoutineTypeRowProps) {
  const { t } = useTranslation();
  const showActionSheet = useActionSheet();
  const name = t(`routines.labels.${value}`);

  function choose() {
    showActionSheet(
      {
        title: t('routines.editor.label'),
        options: [...ROUTINE_LABELS.map((label) => t(`routines.labels.${label}`)), t('common.cancel')],
        cancelButtonIndex: ROUTINE_LABELS.length,
      },
      (index) => {
        const label = ROUTINE_LABELS[index];
        if (label && label !== value) onChange(label);
      },
    );
  }

  return (
    <SettingsRow
      icon={ROUTINE_ICONS[value]}
      label={t('routines.editor.label')}
      value={name}
      onPress={choose}
      aria-label={t('routines.editor.typeButton', { type: name })}
    />
  );
}
