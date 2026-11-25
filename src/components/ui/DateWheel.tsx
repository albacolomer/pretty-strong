import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppLanguage } from '@/lib/i18n';

import type { DateFieldProps } from './DateField';

export type DateWheelProps = DateFieldProps;

// A day on iOS's own date wheels, e.g. a birth date, far from today.
// (The web's is DateWheel.web.tsx.)
export function DateWheel({ value, onChange, minimumDate, maximumDate }: DateWheelProps) {
  const language = useAppLanguage();

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="spinner"
      locale={language}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onChange={(_event, picked) => {
        if (picked) onChange(picked);
      }}
    />
  );
}
