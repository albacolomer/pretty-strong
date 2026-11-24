import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  Card,
  Logo,
  NumberInput,
  SegmentedControl,
  SettingsCard,
  SettingsRow,
  Stepper,
  Text,
  TextField,
} from '@/components/ui';
import { isUsernameAvailable } from '@/features/auth/api';
import { normalizeUsername, validateUsername } from '@/features/auth/validation';
import { MEASUREMENT_PARTS, type BodyMeasurement, type MeasurementPart } from '@/features/body/body';
import type { ProfileChanges } from '@/features/profile/api';
import { Avatar } from '@/features/profile/Avatar';
import { BirthDateSheet } from '@/features/profile/BirthDateSheet';
import { useProfile } from '@/features/profile/useProfile';
import { useUnits, useUnitsStore } from '@/features/profile/useUnits';
import { dateKey, fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { changeStepGoal, DEFAULT_STEP_GOAL, STEP_GOAL_MAX, STEP_GOAL_MIN } from '@/features/steps/steps';
import { isNetworkError } from '@/lib/errors';
import { useAppLanguage } from '@/lib/i18n';
import {
  DISTANCE_UNITS,
  LENGTH_UNITS,
  WEIGHT_UNITS,
  type Units,
} from '@/lib/units';
import { radius, spacing, typography, useTheme } from '@/theme';

import { ChoiceList } from './ChoiceList';
import { lengthLimits, readLength, readWeight, weightLimits } from './setupFlow';
import { SetupPage } from './SetupLayout';
import { useSaveSetupMeasurements, useSaveSetupProfile, useSaveSetupWeight } from './useSetupSaves';

export type StepProps = {
  // "Pas 2 de 6".
  eyebrow: string;
  // On to the next step; what's filled in is saved first.
  next: () => void;
};

// The longest name Edita el perfil takes.
const NAME_MAX_LENGTH = 50;

// Why a username can't be kept; each is also auth.errors.<error>.
type UsernameError = 'required' | 'invalidUsername' | 'usernameTaken' | 'network' | 'unknown';

// 1. Your name, your username (made from your email at sign-up, so it can
// just be kept), and a photo if you like (saved as soon as it's picked).
export function NameStep({ eyebrow, next }: StepProps) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const save = useSaveSetupProfile();
  const [name, setName] = useState('');
  // Null until typed in: the one made at sign-up shows, once the profile
  // has loaded.
  const [username, setUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<UsernameError | null>(null);
  const [checking, setChecking] = useState(false);
  const shownUsername = username ?? profile?.username ?? '';
  const usernameRef = useRef<TextInputInstance>(null);

  // A changed username is checked before going on; a taken one stays here.
  async function submit() {
    const changes: ProfileChanges = {};
    const clean = name.trim();
    if (clean !== '') changes.display_name = clean;
    if (username !== null && profile && normalizeUsername(username) !== profile.username) {
      const wanted = normalizeUsername(username);
      const invalid = validateUsername(wanted);
      if (invalid) {
        setUsernameError(invalid === 'required' ? 'required' : 'invalidUsername');
        return;
      }
      setChecking(true);
      try {
        if (!(await isUsernameAvailable(wanted))) {
          setUsernameError('usernameTaken');
          return;
        }
      } catch (error) {
        setUsernameError(isNetworkError(error) ? 'network' : 'unknown');
        return;
      } finally {
        setChecking(false);
      }
      changes.username = wanted;
    }
    if (Object.keys(changes).length > 0) save.mutate(changes);
    next();
  }

  return (
    <SetupPage
      eyebrow={eyebrow}
      title={t('setup.name.title')}
      subtitle={t('setup.name.subtitle')}
      onContinue={() => void submit()}
      continueDisabled={checking}
      onSkip={next}>
      <View style={styles.avatar}>
        <Avatar profile={profile} />
        <Text variant="caption" color="textMuted">
          {t('setup.name.photoHint')}
        </Text>
      </View>
      <TextField
        label={t('profile.name')}
        placeholder={profile?.username}
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX_LENGTH}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => usernameRef.current?.focus()}
      />
      <TextField
        ref={usernameRef}
        label={t('auth.username')}
        hint={t('auth.usernameHint')}
        error={usernameError ? t(`auth.errors.${usernameError}`) : undefined}
        value={shownUsername}
        onChangeText={(text) => {
          setUsername(text);
          setUsernameError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        // Not "username": iOS should pair the saved password with the email.
        textContentType="none"
        maxLength={20}
        returnKeyType="next"
        onSubmitEditing={() => void submit()}
      />
    </SetupPage>
  );
}

// Matching profiles_gender_check; 'none' is "Prefereixo no dir-ho", saved
// as no gender.
const GENDERS = ['female', 'male', 'non_binary', 'none'] as const;
type GenderChoice = (typeof GENDERS)[number];

// 2. Gender and birth date (for your age), only for you to see.
export function AboutStep({ eyebrow, next }: StepProps) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const save = useSaveSetupProfile();
  const [gender, setGender] = useState<GenderChoice | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [pickingDate, setPickingDate] = useState(false);
  const birthDateText = birthDate
    ? new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(fromDateKey(birthDate))
    : undefined;

  function submit() {
    if (gender !== null || birthDate !== null) {
      save.mutate({
        ...(gender !== null ? { gender: gender === 'none' ? null : gender } : {}),
        ...(birthDate !== null ? { birth_date: birthDate } : {}),
      });
    }
    next();
  }

  return (
    <SetupPage
      eyebrow={eyebrow}
      title={t('setup.about.title')}
      subtitle={t('setup.about.subtitle')}
      onContinue={submit}
      onSkip={next}>
      <View style={styles.group}>
        <Text variant="label" color="textMuted">
          {t('profile.gender')}
        </Text>
        <ChoiceList
          label={t('profile.gender')}
          options={GENDERS.map((value) => ({
            value,
            label: value === 'none' ? t('profile.genderNone') : t(`profile.genders.${value}`),
          }))}
          value={gender}
          onChange={setGender}
        />
      </View>
      <View style={styles.group}>
        <Text variant="label" color="textMuted">
          {t('profile.birthDate')}
        </Text>
        <SettingsCard>
          <SettingsRow
            icon="birthday.cake"
            label={birthDateText ?? t('setup.about.pickDate')}
            aria-label={`${t('profile.birthDate')}, ${birthDateText ?? t('setup.about.pickDate')}`}
            onPress={() => setPickingDate(true)}
          />
        </SettingsCard>
      </View>
      <BirthDateSheet
        visible={pickingDate}
        value={birthDate}
        onDone={(date) => {
          setBirthDate(date);
          setPickingDate(false);
        }}
        onClose={() => setPickingDate(false)}
      />
    </SetupPage>
  );
}

// 3. kg or lb, cm or in, km or miles. The next steps ask in these.
export function UnitsStep({ eyebrow, next }: StepProps) {
  const { t } = useTranslation();
  const save = useSaveSetupProfile();
  const setSavedUnits = useUnitsStore((state) => state.setUnits);
  const saved = useUnits();
  const [units, setUnits] = useState<Units>(saved);

  function submit() {
    // On the phone too, so the next steps ask in them straight away.
    setSavedUnits(units);
    save.mutate({
      weight_unit: units.weight,
      length_unit: units.length,
      distance_unit: units.distance,
    });
    next();
  }

  const rows = [
    { kind: 'weight', icon: 'scalemass', options: WEIGHT_UNITS },
    { kind: 'length', icon: 'ruler', options: LENGTH_UNITS },
    { kind: 'distance', icon: 'map', options: DISTANCE_UNITS },
  ] as const;

  return (
    <SetupPage
      eyebrow={eyebrow}
      title={t('setup.units.title')}
      subtitle={t('setup.units.subtitle')}
      onContinue={submit}
      onSkip={next}>
      <SettingsCard>
        {rows.map(({ kind, icon, options }) => (
          <SettingsRow key={kind} icon={icon} label={t(`profile.unitKinds.${kind}`)}>
            <SegmentedControl
              label={t(`profile.unitKinds.${kind}`)}
              options={options.map((unit) => ({ value: unit, label: t(`units.short.${unit}`) }))}
              value={units[kind]}
              onChange={(unit) => setUnits((current) => ({ ...current, [kind]: unit }))}
            />
          </SettingsRow>
        ))}
      </SettingsCard>
    </SetupPage>
  );
}

// 4. Today's weight, the first point on Cos's chart.
export function WeightStep({ eyebrow, next }: StepProps) {
  const { t } = useTranslation();
  const unit = useUnits().weight;
  const today = dateKey(useToday());
  const save = useSaveSetupWeight();
  const [text, setText] = useState('');
  const reading = readWeight(text, unit);
  const unitText = t(`units.short.${unit}`);

  function submit() {
    if (reading.status === 'ok') save.mutate({ date: today, weightKg: reading.value });
    next();
  }

  return (
    <SetupPage
      eyebrow={eyebrow}
      title={t('setup.weight.title')}
      subtitle={t('setup.weight.subtitle')}
      onContinue={submit}
      continueDisabled={reading.status === 'invalid'}
      onSkip={next}>
      <View style={styles.weight}>
        <View style={styles.weightRow}>
          <NumberInput
            label={t('setup.weight.label', { unit: unitText })}
            labelHidden
            value={text}
            onChangeText={setText}
            decimal
            maxLength={5}
            style={styles.weightInput}
          />
          <Text variant="cardTitle" color="textMuted">
            {unitText}
          </Text>
        </View>
        {reading.status === 'invalid' ? (
          <Text variant="caption" color="danger" role="alert">
            {t('setup.weight.outOfRange', { ...weightLimits(unit), unit: unitText })}
          </Text>
        ) : null}
      </View>
    </SetupPage>
  );
}

// 5. Optional: the usual measurements, any of them.
export function MeasurementsStep({ eyebrow, next }: StepProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unit = useUnits().length;
  const today = dateKey(useToday());
  const save = useSaveSetupMeasurements();
  const [texts, setTexts] = useState<Partial<Record<MeasurementPart, string>>>({});
  const unitText = t(`units.short.${unit}`);
  const readings = MEASUREMENT_PARTS.map((part) => ({
    part,
    reading: readLength(texts[part] ?? '', unit),
  }));
  const anyInvalid = readings.some(({ reading }) => reading.status === 'invalid');

  function submit() {
    const typed: BodyMeasurement[] = readings.flatMap(({ part, reading }) =>
      reading.status === 'ok'
        ? [{ date: today, part, customName: null, valueCm: reading.value }]
        : [],
    );
    if (typed.length > 0) save.mutate(typed);
    next();
  }

  return (
    <SetupPage
      eyebrow={eyebrow}
      title={t('setup.measurements.title')}
      subtitle={t('setup.measurements.subtitle')}
      onContinue={submit}
      continueDisabled={anyInvalid}
      onSkip={next}>
      <Card style={styles.measurements}>
        {readings.map(({ part, reading }, index) => {
          const name = t(`body.parts.${part}`);
          return (
            <View
              key={part}
              style={[styles.measurement, index > 0 && styles.measurementSpaced]}>
              <Text variant="bodyStrong" style={styles.measurementName}>
                {name}
              </Text>
              <NumberInput
                label={t('setup.measurements.value', { name, unit: unitText })}
                labelHidden
                value={texts[part] ?? ''}
                onChangeText={(text) => setTexts((current) => ({ ...current, [part]: text }))}
                decimal
                maxLength={5}
                style={[
                  styles.measurementInput,
                  reading.status === 'invalid' && [styles.invalid, { borderColor: colors.danger }],
                ]}
              />
              <Text color="textMuted" style={styles.measurementUnit}>
                {unitText}
              </Text>
            </View>
          );
        })}
      </Card>
      {anyInvalid ? (
        <Text variant="caption" color="danger" role="alert">
          {t('setup.measurements.outOfRange', { ...lengthLimits(unit), unit: unitText })}
        </Text>
      ) : null}
    </SetupPage>
  );
}

// The weekly goal's range, matching profiles_weekly_goal_check.
const GOAL_MIN = 1;
const GOAL_MAX = 14;
// Where the weekly goal starts if you haven't planned your week yet.
const GOAL_START = 3;

// 6. Workouts a week and steps a day.
export function GoalsStep({ eyebrow, next }: StepProps) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const { data: profile } = useProfile();
  const save = useSaveSetupProfile();
  const [goal, setGoal] = useState(profile?.weekly_goal ?? GOAL_START);
  const [stepGoal, setStepGoal] = useState(profile?.daily_step_goal ?? DEFAULT_STEP_GOAL);
  const stepCount = new Intl.NumberFormat(language).format(stepGoal);

  function submit() {
    save.mutate({ weekly_goal: goal, daily_step_goal: stepGoal });
    next();
  }

  return (
    <SetupPage
      eyebrow={eyebrow}
      title={t('setup.goals.title')}
      subtitle={t('setup.goals.subtitle')}
      onContinue={submit}
      onSkip={next}>
      <SettingsCard>
        <SettingsRow icon="calendar" label={t('profile.weeklyGoal')}>
          <View style={styles.stepper}>
            <Stepper
              value={String(goal)}
              valueLabel={t('profile.goalValue', { count: goal })}
              onDecrement={() => setGoal(Math.max(GOAL_MIN, goal - 1))}
              onIncrement={() => setGoal(Math.min(GOAL_MAX, goal + 1))}
              decrementLabel={t('profile.goalMinus')}
              incrementLabel={t('profile.goalPlus')}
              canDecrement={goal > GOAL_MIN}
              canIncrement={goal < GOAL_MAX}
            />
          </View>
        </SettingsRow>
        <SettingsRow icon="figure.walk" label={t('profile.stepGoal')}>
          <View style={styles.stepper}>
            <Stepper
              value={stepCount}
              valueLabel={t('profile.stepGoalValue', { steps: stepCount })}
              onDecrement={() => setStepGoal(changeStepGoal(stepGoal, -1))}
              onIncrement={() => setStepGoal(changeStepGoal(stepGoal, 1))}
              decrementLabel={t('profile.stepGoalMinus')}
              incrementLabel={t('profile.stepGoalPlus')}
              canDecrement={stepGoal > STEP_GOAL_MIN}
              canIncrement={stepGoal < STEP_GOAL_MAX}
            />
          </View>
        </SettingsRow>
      </SettingsCard>
      <Text variant="caption" color="textMuted">
        {t('setup.goals.later')}
      </Text>
    </SetupPage>
  );
}

// The end: the logo, and into the app.
export function ReadyStep({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const name = profile?.display_name?.split(' ')[0];

  return (
    <SetupPage
      centered
      title={name ? t('setup.ready.titleNamed', { name }) : t('setup.ready.title')}
      subtitle={t('setup.ready.subtitle')}
      continueLabel={t('setup.ready.start')}
      onContinue={onStart}
      top={<Logo width={160} />}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  group: {
    gap: spacing.sm,
  },
  stepper: {
    alignItems: 'center',
  },
  weight: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weightInput: {
    minWidth: 168,
    minHeight: 88,
    borderRadius: radius.card,
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.fontSize,
  },
  measurements: {
    gap: 0,
  },
  measurement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  measurementSpaced: {
    marginTop: spacing.sm,
  },
  measurementName: {
    flex: 1,
  },
  measurementInput: {
    width: 96,
  },
  measurementUnit: {
    minWidth: 24,
  },
  // Red outline on a measurement the database wouldn't take.
  invalid: {
    borderWidth: 1.5,
  },
});
