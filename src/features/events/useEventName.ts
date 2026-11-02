import { useTranslation } from 'react-i18next';

import type { CalendarEvent } from './events';

// What an event is called: its own name, or its kind's in the app's
// language ("Marató").
export function useEventName(): (event: Pick<CalendarEvent, 'kind' | 'name'>) => string {
  const { t } = useTranslation();
  return (event) => event.name ?? t(`events.kinds.${event.kind}`);
}
