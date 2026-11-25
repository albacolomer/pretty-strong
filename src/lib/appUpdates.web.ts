import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useToast } from '@/components/ui';

import type { AppUpdateOptions } from './appUpdates';
import i18n from './i18n';

export type { AppUpdateOptions } from './appUpdates';

// The web app's updates (spec: "Web app"). Registers the service worker
// (scripts/service-worker.js), which saves the app so it opens with no
// signal. When a new deploy's worker has installed:
// - if this page already is that version (it came from the network), the
//   worker simply takes over;
// - otherwise the page is older: it reloads by itself when the app comes
//   back to the front, or at once from the toast's "Actualitza", but never
//   during a workout.
export function useAppUpdates({ isBusy }: AppUpdateOptions) {
  const showToast = useToast();

  useEffect(() => {
    // In development the bundler serves the code; saving it would only
    // hide changes.
    if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const workers = navigator.serviceWorker;
    const pageVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
    let registration: ServiceWorkerRegistration | null = null;
    // A newer version, installed and waiting for a good moment.
    let newer: ServiceWorker | null = null;
    let reloading = false;
    let stopped = false;

    function apply() {
      if (!newer || isBusy()) return;
      reloading = true;
      newer.postMessage({ type: 'ACTIVATE' });
    }

    async function consider(worker: ServiceWorker) {
      const version = await versionOf(worker);
      if (stopped) return;
      if (version !== null && version === pageVersion) {
        worker.postMessage({ type: 'ACTIVATE' });
        return;
      }
      newer = worker;
      if (isBusy()) return;
      showToast({
        message: i18n.t('updates.ready'),
        action: { label: i18n.t('updates.reload'), onPress: apply },
        durationMs: 10000,
      });
    }

    function follow(worker: ServiceWorker | null) {
      if (!worker) return;
      if (worker.state === 'installed') {
        void consider(worker);
        return;
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') void consider(worker);
      });
    }

    function onControllerChange() {
      if (reloading) window.location.reload();
    }
    workers.addEventListener('controllerchange', onControllerChange);

    workers
      .register('/sw.js')
      .then((found) => {
        if (stopped) return;
        registration = found;
        follow(found.waiting ?? found.installing);
        found.addEventListener('updatefound', () => follow(found.installing));
      })
      .catch(() => {
        // Not allowed here (e.g. a private window): the app works online.
      });

    // Back to the front: switch if a newer version was waiting, then look
    // for one deployed since.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      apply();
      registration?.update().catch(() => undefined);
    });

    return () => {
      stopped = true;
      subscription.remove();
      workers.removeEventListener('controllerchange', onControllerChange);
    };
  }, [isBusy, showToast]);
}

// The version a worker was built with, or null if it doesn't answer.
function versionOf(worker: ServiceWorker): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 3000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(typeof event.data === 'string' ? event.data : null);
    };
    worker.postMessage({ type: 'VERSION' }, [channel.port2]);
  });
}
