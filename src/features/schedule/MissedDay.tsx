import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

const ICON = 40;

type MissedDayProps = {
  // Yesterday's routine, not logged at all.
  name: string;
  onDoToday: () => void;
  // Move it, shift the week, rearrange it, or leave it skipped.
  onOtherOptions: () => void;
};

// The missed-day nudge on Avui (US-29): "Ahir no vas fer «Tren inferior 1».
// La fas avui?", with "Fes-la avui" and "Altres opcions". Any answer moves
// the routine or logs it, so the card goes, once and for all.
export function MissedDay({ name, onDoToday, onOtherOptions }: MissedDayProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card style={[styles.card, { borderColor: colors.accent }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <SymbolView name="arrow.uturn.forward" size={18} tintColor={colors.accent} />
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" accessibilityRole="header">
            {t('today.missedTitle', { name })}
          </Text>
          <Text color="textMuted">{t('today.missedQuestion')}</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button
          label={t('today.otherOptions')}
          variant="secondary"
          onPress={onOtherOptions}
          style={styles.button}
        />
        <Button label={t('today.doItToday')} onPress={onDoToday} style={styles.button} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
