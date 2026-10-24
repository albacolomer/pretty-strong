import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NumberInput, Sheet, TextField } from '@/components/ui';
import { formatInput } from '@/features/routines/targets';
import { dateKey } from '@/features/schedule/dates';
import { DayStepper } from '@/features/schedule/DayStepper';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage } from '@/lib/i18n';

import { MEASUREMENT_CM, readDecimal, type BodyMeasurement, type MeasurementSummary } from './body';
import { useMeasurementName } from './useMeasurementName';
import { useSaveMeasurements } from './useBody';

// The longest name of your own (body_measurements_custom_name_check).
const NAME_MAX_LENGTH = 40;

// Mesures → Edita (US-28): a day's measuring, every measurement at once,
// with the last value as a hint; only the ones typed are saved. "+
// Afegeix" opens it with a measurement of your own to name first.
export function MeasurementsSheet({
  visible,
  adding,
  measurements,
  onClose,
}: {
  visible: boolean;
  // Opened from "+ Afegeix": a new measurement to name.
  adding: boolean;
  measurements: MeasurementSummary[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const nameOf = useMeasurementName();
  const today = dateKey(useToday());
  const save = useSaveMeasurements();
  const [date, setDate] = useState(today);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');

  const usual: BodyMeasurement[] = measurements.flatMap((measurement) => {
    const valueCm = readDecimal(texts[measurement.key] ?? '', MEASUREMENT_CM);
    return valueCm === null
      ? []
      : [{ date, part: measurement.part, customName: measurement.customName, valueCm }];
  });
  const newCm = readDecimal(newValue, MEASUREMENT_CM);
  const name = newName.trim();
  // What gets saved: the typed values, or the one being added.
  const typed: BodyMeasurement[] = adding
    ? name !== '' && newCm !== null
      ? [{ date, part: null, customName: name, valueCm: newCm }]
      : []
    : usual;

  function close() {
    setTexts({});
    setNewName('');
    setNewValue('');
    setDate(today);
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      title={adding ? t('body.addMeasurement') : t('body.measurements')}
      saveLabel={t('body.save')}
      saveDisabled={typed.length === 0}
      onCancel={close}
      onSave={() => {
        save.mutate(typed);
        close();
      }}>
      <DayStepper date={date} latest={today} onChange={setDate} />
      {adding ? (
        <>
          <TextField
            label={t('body.measurementName')}
            placeholder={t('body.measurementNamePlaceholder')}
            value={newName}
            onChangeText={setNewName}
            maxLength={NAME_MAX_LENGTH}
            autoFocus
          />
          <NumberInput
            label={t('body.valueCm', { name: name || t('body.newMeasurement') })}
            value={newValue}
            onChangeText={setNewValue}
            decimal
            maxLength={5}
          />
        </>
      ) : (
        measurements.map((measurement) => (
          <NumberInput
            key={measurement.key}
            label={t('body.valueCm', { name: nameOf(measurement) })}
            value={texts[measurement.key] ?? ''}
            onChangeText={(text) => setTexts((current) => ({ ...current, [measurement.key]: text }))}
            decimal
            maxLength={5}
            placeholder={
              measurement.valueCm === null ? '–' : formatInput(measurement.valueCm, language)
            }
          />
        ))
      )}
    </Sheet>
  );
}
