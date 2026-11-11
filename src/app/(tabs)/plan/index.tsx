import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, SegmentedControl } from '@/components/ui';
import { ExerciseLibrary } from '@/features/exercises/ExerciseLibrary';
import { RoutineList } from '@/features/routines/RoutineList';
import { WeekSchedule } from '@/features/schedule/WeekSchedule';
import { spacing } from '@/theme';

type Section = 'routines' | 'exercises' | 'week';

export default function PlanScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('routines');
  const scroll = useRef<ScrollViewInstance>(null);
  const insets = useSafeAreaInsets();

  const sections = [
    { value: 'routines', label: t('plan.routines') },
    { value: 'exercises', label: t('plan.exercises') },
    { value: 'week', label: t('plan.week') },
  ] as const;

  return (
    <Screen title={t('tabs.plan')} ref={scroll}>
      <SegmentedControl
        label={t('tabs.plan')}
        options={sections}
        value={section}
        onChange={setSection}
      />
      {section === 'routines' ? <RoutineList /> : null}
      {section === 'exercises' ? <ExerciseLibrary /> : null}
      {section === 'week' ? (
        <WeekSchedule
          // A day tapped in the week strip: its card just under the status bar.
          onScrollTo={(y) =>
            scroll.current?.scrollTo({ y: y - insets.top - spacing.lg, animated: true })
          }
        />
      ) : null}
    </Screen>
  );
}
