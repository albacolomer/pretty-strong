import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, environment, labelsHidden } from '@expo/ui/swift-ui/modifiers';

import { useAppLanguage } from '@/lib/i18n';
import { useTheme } from '@/theme';

export type DateFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  // What screen readers say; the row around it shows it too.
  label: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

// A day, as iOS's own compact picker: a pill with the date that opens a
// calendar. (The web's is DateField.web.tsx.)
export function DateField({ value, onChange, minimumDate, maximumDate }: DateFieldProps) {
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const range = minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined;

  return (
    <Host matchContents alignment="trailing" colorScheme={scheme} seedColor={colors.accent}>
      <DatePicker
        selection={value}
        onDateChange={onChange}
        range={range}
        modifiers={[datePickerStyle('compact'), labelsHidden(), environment('locale', language)]}
      />
    </Host>
  );
}
