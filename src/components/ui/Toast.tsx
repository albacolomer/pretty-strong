import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export type ToastOptions = {
  // Already translated.
  message: string;
  // E.g. "Desfés": the spec prefers undo over "Are you sure?".
  action?: { label: string; onPress: () => void };
  durationMs?: number;
};

type ShownToast = ToastOptions & { id: number };

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

const DEFAULT_DURATION_MS = 5000;
// Keeps the toast above the tab bar.
const TAB_BAR_CLEARANCE = 56;

// Shows one short message at a time at the bottom of the screen, from any
// screen: const showToast = useToast(); showToast({ message, action }).
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ShownToast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
    AccessibilityInfo.announceForAccessibility(options.message);
  }, []);

  // A new toast replaces the old one and restarts the clock.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.durationMs ?? DEFAULT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <View
            pointerEvents="box-none"
            style={[styles.host, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
            {/* Not one grouped element: the action button must stay reachable on its
                own. VoiceOver reads the message via announceForAccessibility. */}
            <View style={[styles.toast, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={styles.message}>{toast.message}</Text>
              {toast.action ? (
                <Button
                  label={toast.action.label}
                  variant="ghost"
                  onPress={() => {
                    toast.action?.onPress();
                    setToast(null);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </ToastContext>
  );
}

export function useToast(): (options: ToastOptions) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast() must be used inside <ToastProvider>.');
  return show;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  message: {
    flex: 1,
  },
});
