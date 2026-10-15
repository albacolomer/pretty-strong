import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Screen, SegmentedControl, Text } from '@/components/ui';
import { ExerciseLibrary } from '@/features/exercises/ExerciseLibrary';
import { RoutineList } from '@/features/routines/RoutineList';

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
      {section === 'routines' ? <RoutineList /> : null}
      {section === 'exercises' ? <ExerciseLibrary /> : null}
      {section === 'week' ? (
        // The weekly plan comes with US-09.
        <Card>
          <Text color="textMuted">{t('placeholder.week')}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
