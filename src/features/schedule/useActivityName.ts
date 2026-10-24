import { useTranslation } from 'react-i18next';

import type { Sport } from './sports';

type Named =
  | { kind: 'routine'; routine: { name: string } }
  | { kind: 'sport'; sport: { sport: Sport; customName: string | null } };

// What a planned activity is called: a routine's name; a sport's name in
// the app's language, or your own for "Altres".
export function useActivityName(): (activity: Named) => string {
  const { t } = useTranslation();
  return (activity) =>
    activity.kind === 'routine'
      ? activity.routine.name
      : (activity.sport.customName ?? t(`sports.${activity.sport.sport}`));
}
