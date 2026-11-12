import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
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
  const scroll = useAnimatedRef<Animated.ScrollView>();
  // While a line in the week strip is dragged, the screen keeps still.
  const [dragging, setDragging] = useState(false);
  const insets = useSafeAreaInsets();

  const sections = [
    { value: 'routines', label: t('plan.routines') },
    { value: 'exercises', label: t('plan.exercises') },
    { value: 'week', label: t('plan.week') },
  ] as const;

  return (
    <Screen title={t('tabs.plan')} ref={scroll} scrollEnabled={!dragging}>
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
          scrollableRef={scroll}
          onDragChange={setDragging}
          // A day tapped in the week strip: its card just under the status bar.
          onScrollTo={(y) =>
            scroll.current?.scrollTo({ y: y - insets.top - spacing.lg, animated: true })
          }
        />
      ) : null}
    </Screen>
  );
}
