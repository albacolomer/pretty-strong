import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { startOfDay } from './dates';

// Today's date (at midnight), read through a hook so screens re-render when
// it changes: it moves on when the app comes back to the front on a new day.
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setToday((current) => {
        const now = startOfDay(new Date());
        return now.getTime() === current.getTime() ? current : now;
      });
    });
    return () => subscription.remove();
  }, []);

  return today;
}
