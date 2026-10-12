import { useTranslation } from 'react-i18next';

import { Button, Card, Screen, Text } from '@/components/ui';

// Temporary: previews the theme and primitives until the tabs exist (step 4).
export default function Index() {
  const { t } = useTranslation();
  const noop = () => {};

  return (
    <Screen title={t('preview.title')}>
      <Card>
        <Text variant="cardTitle">{t('preview.card')}</Text>
        <Text color="textMuted">{t('preview.muted')}</Text>
        <Text variant="caption" color="textMuted">
          {t('preview.muted')}
        </Text>
      </Card>

      <Card raised>
        <Text variant="cardTitle">{t('preview.raisedCard')}</Text>
        <Text variant="timer" color="accent">
          1:30
        </Text>
        <Text variant="input">12</Text>
      </Card>

      <Button label={t('preview.start')} onPress={noop} />
      <Button label={t('preview.swap')} variant="secondary" onPress={noop} />
      <Button label={t('preview.skip')} variant="ghost" onPress={noop} />
      <Button label={t('preview.disabled')} disabled onPress={noop} />
    </Screen>
  );
}
