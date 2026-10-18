import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Screen, SegmentedControl } from '@/components/ui';
import { ExerciseLibrary } from '@/features/exercises/ExerciseLibrary';
import { RoutineList } from '@/features/routines/RoutineList';
import { WeekSchedule } from '@/features/schedule/WeekSchedule';

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
      {section === 'week' ? <WeekSchedule /> : null}
    </Screen>
  );
}
