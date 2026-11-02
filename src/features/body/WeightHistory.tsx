import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card, Text, useActionSheet } from '@/components/ui';
import { formatShortDate } from '@/features/history/entries';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, touch, useTheme } from '@/theme';

import type { BodyWeight } from './body';
import { useDeleteWeight, useWeights } from './useBody';

// Body → Pes corporal → Historial (US-28): every weighing, newest first.
// Tap one to delete it, with "Desfés"; to change one, log that day again.
export function WeightHistory() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const language = useAppLanguage();
  const { data: weights = [], isPending, isError } = useWeights();
  const remove = useDeleteWeight();
  const kg = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function openMenu(weight: BodyWeight) {
    showActionSheet(
      {
        title: `${kg.format(weight.weightKg)} kg · ${formatShortDate(weight.date, language)}`,
        options: [t('body.deleteWeight'), t('common.cancel')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) remove.mutate(weight);
      },
    );
  }

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('body.loadError')}</Text>;
  if (weights.length === 0) return <Text color="textMuted">{t('body.noWeight')}</Text>;

  return (
    <Card>
      {weights.map((weight) => (
        <Pressable
          key={weight.id}
          role="button"
          aria-label={t('body.weightOn', {
            weight: `${kg.format(weight.weightKg)} kg`,
            date: formatShortDate(weight.date, language),
          })}
          onPress={() => openMenu(weight)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.date}>{formatShortDate(weight.date, language)}</Text>
          <View style={styles.weight}>
            <Text variant="bodyStrong">{kg.format(weight.weightKg)}</Text>
            <Text variant="caption" color="textMuted">
              kg
            </Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
  },
  date: {
    flex: 1,
  },
  weight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
});
