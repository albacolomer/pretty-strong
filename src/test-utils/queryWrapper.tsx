import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Wraps a component or hook under test in its own, fresh TanStack Query
// cache. Created once per test (not inside the wrapper) so re-renders keep
// the same cache.
export function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      // No retries, so a failure shows at once. gcTime Infinity: no
      // clean-up timers, which would otherwise keep Jest from exiting.
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
