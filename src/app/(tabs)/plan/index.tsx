import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Screen, SegmentedControl, Text } from '@/components/ui';
import { ExerciseLibrary } from '@/features/exercises/ExerciseLibrary';

type Section = 'routines' | 'exercises' | 'week';

export default function PlanScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('routines');

  const sections = [
    { value: 'routines', label: t('plan.routines') },
    { value: 'exercises', label: t('plan.exercises') },
    { value: 'week', label: t('plan.week') },
  ] as const;

  return (
    <Screen title={t('tabs.plan')}>
      <SegmentedControl
        label={t('tabs.plan')}
        options={sections}
        value={section}
        onChange={setSection}
      />
      {section === 'exercises' ? (
        <ExerciseLibrary />
      ) : (
        // Routines and the weekly plan come with their own stories.
        <Card>
          <Text color="textMuted">
            {section === 'routines' ? t('placeholder.routines') : t('placeholder.week')}
          </Text>
        </Card>
      )}
    </Screen>
  );
}
