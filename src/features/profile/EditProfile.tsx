import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Stepper, Text, TextField } from '@/components/ui';
import { weeklyGoal } from '@/features/history/entries';
import { useRoutines } from '@/features/routines/useRoutines';
import { useWeeklySports } from '@/features/schedule/useWeeklySports';
import { spacing, useTheme } from '@/theme';

import type { Profile } from './api';
import { useProfile } from './useProfile';
import { useUpdateProfile } from './useUpdateProfile';

// The weekly goal's range, matching profiles_weekly_goal_check.
const GOAL_MIN = 1;
const GOAL_MAX = 14;

// Profile → Edita el perfil: name, city, focus and the weekly goal.
export function EditProfile({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { data: profile } = useProfile();
  if (!profile) return <ActivityIndicator color={colors.accent} />;
  return <Form profile={profile} onClose={onClose} />;
}

function Form({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: routines = [] } = useRoutines();
  const save = useUpdateProfile();
  const [name, setName] = useState(profile.display_name ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [focus, setFocus] = useState(profile.focus ?? '');
  // Null: as many as the days planned in the week.
  const [goal, setGoal] = useState(profile.weekly_goal);
  const { data: sports = [] } = useWeeklySports();
  const planned = weeklyGoal(null, routines, sports);
  const shown = goal ?? planned;

  const clean = (text: string) => (text.trim() === '' ? null : text.trim());

  function submit() {
    save.mutate(
      { display_name: clean(name), city: clean(city), focus: clean(focus), weekly_goal: goal },
      { onSuccess: onClose },
    );
  }

  return (
    <View style={styles.form}>
      <TextField
        label={t('profile.name')}
        value={name}
        onChangeText={setName}
        placeholder={profile.username}
        maxLength={50}
        textContentType="name"
      />
      <TextField
        label={t('profile.city')}
        value={city}
        onChangeText={setCity}
        placeholder={t('profile.cityPlaceholder')}
        maxLength={50}
      />
      <TextField
        label={t('profile.focus')}
        value={focus}
        onChangeText={setFocus}
        placeholder={t('profile.focusPlaceholder')}
        maxLength={60}
      />

      <View style={styles.goal}>
        <Text variant="bodyStrong">{t('profile.weeklyGoal')}</Text>
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
        <Text variant="caption" color="textMuted">
          {goal === null ? t('profile.goalFromPlan') : t('profile.goalOwn')}
        </Text>
        {goal !== null && planned !== null ? (
          <Button
            label={t('profile.goalUsePlan', { count: planned })}
            variant="ghost"
            onPress={() => setGoal(null)}
            style={styles.reset}
          />
        ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  goal: {
    gap: spacing.sm,
  },
  reset: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
