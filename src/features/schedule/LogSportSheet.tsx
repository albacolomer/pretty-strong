import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { NumberInput, Sheet, TextField } from '@/components/ui';
import { readMinutes } from '@/features/workout/session';

import { PLANNABLE_SPORTS, SPORT_NAME_MAX_LENGTH, SPORTS, type Sport } from './sports';
import { SportGrid } from './SportGrid';

export type LoggedSport = { sport: Sport; customName: string | null; durationS: number | null };

// Avui → + → "Registra un esport": a sport done today that wasn't planned,
// with how long it took. With `pick`, Canvia → "Un esport": just which
// sport (no walk or stretching, which aren't workouts), and the sheet stays
// open for the reason, so the caller closes it. Give it a new key for each
// opening, so it starts afresh.
export function LogSportSheet({
  visible,
  onClose,
  onSave,
  pick = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (logged: LoggedSport) => void;
  pick?: boolean;
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
      title={pick ? t('today.pickSport') : t('today.logSportTitle')}
      onCancel={onClose}
      saveLabel={pick ? t('today.choose') : t('schedule.save')}
      saveDisabled={!ready}
      onSave={() => {
        if (!sport || !ready) return;
        onSave({
          sport,
          customName: sport === 'other' ? name : null,
          durationS: pick ? null : readMinutes(minutes),
        });
        if (!pick) onClose();
      }}>
      <SportGrid value={sport} onChange={setSport} sports={pick ? PLANNABLE_SPORTS : SPORTS} />
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
      {pick ? null : (
        <NumberInput
          label={t('workout.quickLog.duration')}
          value={minutes}
          onChangeText={setMinutes}
          placeholder="60"
          maxLength={4}
          style={styles.minutes}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  minutes: {
    alignSelf: 'flex-start',
    width: 120,
  },
});
