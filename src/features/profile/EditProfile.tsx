import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Stepper,
  TextSheet,
  useActionSheet,
} from '@/components/ui';
import { weeklyGoal } from '@/features/history/entries';
import { useRoutines } from '@/features/routines/useRoutines';
import { useToday } from '@/features/schedule/useToday';
import { useWeeklySports } from '@/features/schedule/useWeeklySports';
import { changeStepGoal, STEP_GOAL_MAX, STEP_GOAL_MIN } from '@/features/steps/steps';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { ageOn } from './age';
import type { Profile } from './api';
import { BirthDateSheet } from './BirthDateSheet';
import { useProfile } from './useProfile';
import { useUpdateProfile } from './useUpdateProfile';

// The weekly goal's range, matching profiles_weekly_goal_check.
const GOAL_MIN = 1;
const GOAL_MAX = 14;

// Matching profiles_gender_check; none means you'd rather not say.
const GENDERS = ['female', 'male', 'non_binary'] as const;
type Gender = (typeof GENDERS)[number];

type OpenSheet = 'name' | 'bio' | 'city' | 'birthDate';

// Profile → Edita el perfil: about you (name, bio, city, gender, age), then
// your goals (workouts a week, steps a day). Each row opens its sheet;
// nothing is saved until Desa.
export function EditProfile({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { data: profile } = useProfile();
  if (!profile) return <ActivityIndicator color={colors.accent} />;
  return <Form profile={profile} onClose={onClose} />;
}

function Form({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const today = useToday();
  const showActionSheet = useActionSheet();
  const { data: routines = [] } = useRoutines();
  const save = useUpdateProfile();
  const [name, setName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [gender, setGender] = useState(profile.gender as Gender | null);
  const [birthDate, setBirthDate] = useState(profile.birth_date);
  // Null: as many as the days planned in the week.
  const [goal, setGoal] = useState(profile.weekly_goal);
  const { data: sports = [] } = useWeeklySports();
  const planned = weeklyGoal(null, routines, sports);
  const shown = goal ?? planned;
  const [stepGoal, setStepGoal] = useState(profile.daily_step_goal);
  const stepCount = new Intl.NumberFormat(language).format(stepGoal);
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const close = () => setOpenSheet(null);

  const clean = (text: string) => (text.trim() === '' ? null : text.trim());

  function pickGender() {
    showActionSheet(
      {
        title: t('profile.gender'),
        options: [
          ...GENDERS.map((option) => t(`profile.genders.${option}`)),
          t('profile.genderNone'),
          t('common.cancel'),
        ],
        cancelButtonIndex: GENDERS.length + 1,
      },
      (index) => {
        if (index < GENDERS.length) setGender(GENDERS[index]);
        else if (index === GENDERS.length) setGender(null);
      },
    );
  }

  function submit() {
    save.mutate(
      {
        display_name: clean(name),
        bio: clean(bio),
        city: clean(city),
        gender,
        birth_date: birthDate,
        weekly_goal: goal,
        daily_step_goal: stepGoal,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.section}>
        <SectionHeader title={t('profile.aboutYou')} />
        <SettingsCard>
          <SettingsRow
            icon="person"
            label={t('profile.name')}
            value={clean(name) ?? undefined}
            optional
            onPress={() => setOpenSheet('name')}
          />
          <SettingsRow
            icon="text.quote"
            label={t('profile.bio')}
            value={clean(bio)?.split('\n')[0]}
            optional
            onPress={() => setOpenSheet('bio')}
          />
          <SettingsRow
            icon="mappin.and.ellipse"
            label={t('profile.city')}
            value={clean(city) ?? undefined}
            optional
            onPress={() => setOpenSheet('city')}
          />
          <SettingsRow
            icon="figure.stand"
            label={t('profile.gender')}
            value={gender ? t(`profile.genders.${gender}`) : undefined}
            optional
            onPress={pickGender}
          />
          <SettingsRow
            icon="birthday.cake"
            label={t('profile.age')}
            value={
              birthDate ? t('profile.ageValue', { count: ageOn(birthDate, today) }) : undefined
            }
            optional
            onPress={() => setOpenSheet('birthDate')}
          />
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('profile.goals')} />
        <SettingsCard>
          <SettingsRow icon="calendar" label={t('profile.weeklyGoal')}>
            <View style={styles.stepper}>
              <Stepper
                value={shown === null ? '–' : String(shown)}
                valueLabel={t('profile.goalValue', { count: shown ?? 0 })}
                muted={goal === null}
                onDecrement={() => setGoal(Math.max(GOAL_MIN, (shown ?? GOAL_MIN + 1) - 1))}
                onIncrement={() => setGoal(Math.min(GOAL_MAX, (shown ?? GOAL_MIN - 1) + 1))}
                decrementLabel={t('profile.goalMinus')}
                incrementLabel={t('profile.goalPlus')}
                canDecrement={shown === null || shown > GOAL_MIN}
                canIncrement={shown === null || shown < GOAL_MAX}
              />
              {goal !== null && planned !== null ? (
                <Button
                  label={t('profile.goalUsePlan', { count: planned })}
                  variant="ghost"
                  onPress={() => setGoal(null)}
                />
              ) : null}
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
      </View>

      <View style={styles.footer}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={styles.footerButton}
        />
        <Button
          label={t('profile.save')}
          onPress={submit}
          disabled={save.isPending}
          style={styles.footerButton}
        />
      </View>

      <TextSheet
        visible={openSheet === 'name'}
        kind="line"
        title={t('profile.name')}
        label={t('profile.name')}
        placeholder={profile.username}
        value={name}
        maxLength={50}
        onClose={close}
        onDone={(text) => {
          setName(text);
          close();
        }}
      />
      <TextSheet
        visible={openSheet === 'bio'}
        title={t('profile.bio')}
        label={t('profile.bio')}
        placeholder={t('profile.bioPlaceholder')}
        value={bio}
        maxLength={150}
        onClose={close}
        onDone={(text) => {
          setBio(text);
          close();
        }}
      />
      <TextSheet
        visible={openSheet === 'city'}
        kind="line"
        title={t('profile.city')}
        label={t('profile.city')}
        placeholder={t('profile.cityPlaceholder')}
        value={city}
        maxLength={50}
        onClose={close}
        onDone={(text) => {
          setCity(text);
          close();
        }}
      />
      <BirthDateSheet
        visible={openSheet === 'birthDate'}
        value={birthDate}
        onDone={(date) => {
          setBirthDate(date);
          close();
        }}
        onClose={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  stepper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
