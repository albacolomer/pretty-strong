import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export type SheetProps = {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  // Only mounted while open, so it starts afresh each time.
  children: ReactNode;
};

// A form in an iOS page sheet: a title, the fields, then Cancel·la and
// the save button at the bottom (main actions in the bottom half). Swiping
// it down cancels.
export function Sheet({
  visible,
  title,
  onCancel,
  onSave,
  saveLabel,
  saveDisabled = false,
  children,
}: SheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {visible ? (
          <>
            <View style={styles.header}>
              <View style={[styles.grabber, { backgroundColor: colors.surfaceRaised }]} />
              <Text variant="cardTitle" accessibilityRole="header">
                {title}
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets>
              {children}
            </ScrollView>
            <View
              style={[
                styles.footer,
                { borderTopColor: colors.surfaceRaised, paddingBottom: insets.bottom + spacing.sm },
              ]}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={onCancel}
                style={styles.footerButton}
              />
              <Button
                label={saveLabel}
                onPress={onSave}
                disabled={saveDisabled}
                style={styles.footerButton}
              />
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
});
