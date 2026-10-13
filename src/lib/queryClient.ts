import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

// One cache for all server data in the app.
export const queryClient = new QueryClient();

// Phones have no browser "window focus" event, so tell TanStack Query when
// the app comes back to the foreground: stale data then refreshes.
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});
