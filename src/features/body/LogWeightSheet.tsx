import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NumberInput, Sheet } from '@/components/ui';
import { formatInput } from '@/features/routines/targets';
import { dateKey } from '@/features/schedule/dates';
import { DayStepper } from '@/features/schedule/DayStepper';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage } from '@/lib/i18n';

import { readDecimal, WEIGHT_KG } from './body';
import { useSaveWeight } from './useBody';

// "+ Registra el pes" (US-28): today's weight, or another day's. Logging a
// day again replaces it.
export function LogWeightSheet({
  visible,
  latestKg,
  onClose,
}: {
  visible: boolean;
  // Shown greyed as a hint.
  latestKg: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const today = dateKey(useToday());
  const save = useSaveWeight();
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');
  const weightKg = readDecimal(text, WEIGHT_KG);

  function close() {
    setText('');
    setDate(today);
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      title={t('body.logWeight')}
      saveLabel={t('body.save')}
      saveDisabled={weightKg === null}
      onCancel={close}
      onSave={() => {
        if (weightKg === null) return;
        save.mutate({ date, weightKg });
        close();
      }}>
      <DayStepper date={date} latest={today} onChange={setDate} />
      <NumberInput
        label={t('body.weightKg')}
        value={text}
        onChangeText={setText}
        decimal
        autoFocus
        maxLength={5}
        placeholder={latestKg === null ? '–' : formatInput(latestKg, language)}
      />
    </Sheet>
  );
}
