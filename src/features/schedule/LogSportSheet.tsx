import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { NumberInput, Sheet, TextField } from '@/components/ui';
import { readMinutes } from '@/features/workout/session';

import { SPORT_NAME_MAX_LENGTH, SPORTS, type Sport } from './sports';
import { SportGrid } from './SportGrid';

export type LoggedSport = { sport: Sport; customName: string | null; durationS: number | null };

// Avui → + → "Registra un esport": a sport done today that wasn't planned,
// with how long it took. Give it a new key for each opening, so it starts
// afresh.
export function LogSportSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (logged: LoggedSport) => void;
}) {
  const { t } = useTranslation();
  const [sport, setSport] = useState<Sport | null>(null);
  const [customName, setCustomName] = useState('');
  const [minutes, setMinutes] = useState('');
  const name = customName.trim();
  const ready = sport !== null && (sport !== 'other' || name !== '');

  return (
    <Sheet
      visible={visible}
      title={t('today.logSportTitle')}
      onCancel={onClose}
      saveLabel={t('schedule.save')}
      saveDisabled={!ready}
      onSave={() => {
        if (!sport || !ready) return;
        onSave({
          sport,
          customName: sport === 'other' ? name : null,
          durationS: readMinutes(minutes),
        });
        onClose();
      }}>
      <SportGrid value={sport} onChange={setSport} sports={SPORTS} />
      {sport === 'other' ? (
        <TextField
          label={t('schedule.sportName')}
          placeholder={t('schedule.sportNamePlaceholder')}
          value={customName}
          onChangeText={setCustomName}
          maxLength={SPORT_NAME_MAX_LENGTH}
          autoFocus
        />
      ) : null}
      <NumberInput
        label={t('workout.quickLog.duration')}
        value={minutes}
        onChangeText={setMinutes}
        placeholder="60"
        maxLength={4}
        style={styles.minutes}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  minutes: {
    alignSelf: 'flex-start',
    width: 120,
  },
});
