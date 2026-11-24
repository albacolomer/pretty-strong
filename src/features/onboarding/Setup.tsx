import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { SETUP_QUESTIONS, SETUP_STEPS, setupProgress } from './setupFlow';
import { SetupHeader } from './SetupLayout';
import {
  AboutStep,
  GoalsStep,
  MeasurementsStep,
  NameStep,
  ReadyStep,
  UnitsStep,
  WeightStep,
  type StepProps,
} from './SetupSteps';
import { useSetupStore } from './setupStore';

const QUESTIONS = {
  name: NameStep,
  about: AboutStep,
  units: UnitsStep,
  weight: WeightStep,
  measurements: MeasurementsStep,
  goals: GoalsStep,
} satisfies Record<string, (props: StepProps) => ReactNode>;

// The setup after sign-up (US-01): one question a screen, each skippable,
// then "Tot a punt" and into the app. Where you are is kept on the phone,
// so quitting halfway comes back to the same step.
export function Setup() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const index = useSetupStore((state) => state.pending?.step ?? 0);
  const goTo = useSetupStore((state) => state.goTo);
  const finish = useSetupStore((state) => state.finish);
  const step = SETUP_STEPS[index] ?? 'ready';

  return (
    // The buttons rise with the keyboard, so Continua is never under it.
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.screen, { backgroundColor: colors.background }]}>
      {step === 'ready' ? (
        <ReadyStep onStart={finish} />
      ) : (
        <>
          <SetupHeader
            progress={setupProgress(index)}
            onBack={index > 0 ? () => goTo(index - 1) : null}
          />
          {renderQuestion(step, {
            eyebrow: t('setup.progress', { step: index + 1, total: SETUP_QUESTIONS }),
            next: () => goTo(index + 1),
          })}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// Keyed by step, so each one starts fresh and fades in.
function renderQuestion(step: keyof typeof QUESTIONS, props: StepProps) {
  const Question = QUESTIONS[step];
  return <Question key={step} {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
