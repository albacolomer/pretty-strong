import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui';

import { createQueryWrapper } from './queryWrapper';

// A fresh query cache plus the toast provider, like the app's root layout.
// Created once per test.
export function createAppWrapper() {
  const QueryWrapper = createQueryWrapper();
  return function AppWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryWrapper>
        <ToastProvider>{children}</ToastProvider>
      </QueryWrapper>
    );
  };
}
