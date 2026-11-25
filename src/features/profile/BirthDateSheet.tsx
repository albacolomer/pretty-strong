import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, DateWheel, Sheet } from '@/components/ui';
import { dateKey, fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';

const EARLIEST = new Date(1900, 0, 1);

type BirthDateSheetProps = {
  visible: boolean;
  // "1996-11-20", or null for none.
  value: string | null;
  onDone: (birthDate: string | null) => void;
  onClose: () => void;
};

// Your birth date on iOS's own date wheels. Fet keeps it; with one already
// set, it can also be taken away.
export function BirthDateSheet({ visible, value, onDone, onClose }: BirthDateSheetProps) {
  const { t } = useTranslation();
  const today = useToday();
  // With none yet, the wheels start thirty years back.
  const start = () => (value ? fromDateKey(value) : new Date(today.getFullYear() - 30, 0, 1));
  const [date, setDate] = useState(start);
  // Each time it opens, it starts from the value as it is then.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDate(start());
  }

  return (
    <Sheet
      visible={visible}
      title={t('profile.birthDate')}
      saveLabel={t('common.done')}
      onSave={() => onDone(dateKey(date))}
      onCancel={onClose}>
      <DateWheel
        value={date}
        onChange={setDate}
        label={t('profile.birthDate')}
        minimumDate={EARLIEST}
        maximumDate={today}
      />
      {value ? (
        <Button label={t('profile.birthDateClear')} variant="ghost" onPress={() => onDone(null)} />
      ) : null}
    </Sheet>
  );
}
