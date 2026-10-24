import { useTranslation } from 'react-i18next';

import type { MeasurementSummary } from './body';

// A measurement's name: "Cintura" for the usual ones, in the app's
// language; your own as you wrote it.
export function useMeasurementName(): (
  measurement: Pick<MeasurementSummary, 'part' | 'customName'>,
) => string {
  const { t } = useTranslation();
  return (measurement) =>
    measurement.part ? t(`body.parts.${measurement.part}`) : (measurement.customName ?? '');
}
