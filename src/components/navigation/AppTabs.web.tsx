import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

// The web's tab bar, drawn like iOS's own (AppTabs.tsx): a floating pill
// at the bottom, each tab an icon over its name, the open one tinted and
// on a lighter pill. Tapping the open tab goes back to its first screen.
export function AppTabs() {
  const { t } = useTranslation();

  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="dumbbell" label={t('tabs.today')} />
          </TabTrigger>
          <TabTrigger name="plan" href="/plan" asChild>
            <TabButton icon="list.bullet.clipboard" label={t('tabs.plan')} />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="person.crop.circle" label={t('tabs.profile')} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

// Below the screens rather than over them, so nothing scrolls under it.
function TabBar({ children, style, ...rest }: ViewProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}>
      <View
        role="tablist"
        {...rest}
        style={[style, styles.pill, { backgroundColor: colors.surface, boxShadow: shadows.control }]}>
        {children}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

function TabButton({ icon, label, isFocused = false, style, ref, ...rest }: TabButtonProps) {
  const { colors } = useTheme();
  const tint = isFocused ? colors.accent : colors.text;
  const filled = `${icon}.fill` as IconName;

  return (
    <Pressable
      {...rest}
      // Typed by Expo Router as a ref to the View component itself rather
      // than to the view it draws; it is the drawn view.
      ref={ref as never}
      role="tab"
      aria-selected={isFocused}
      aria-label={label}
      // The trigger's own style (a row) first, so the tab's wins.
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        styles.tab,
        isFocused && { backgroundColor: colors.surfaceRaised },
      ]}>
      <Icon name={isFocused ? filled : icon} size={24} tintColor={tint} />
      <Text variant="badge" style={{ color: tint }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  // Expo Router's slot grows with its content (flexShrink 0), so a screen
  // without a stack of its own (Avui) would grow past the window and never
  // scroll. Held to the space above the bar instead.
  slot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
  },
  bar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    minHeight: touch.min + spacing.sm,
    borderRadius: radius.pill,
  },
});
