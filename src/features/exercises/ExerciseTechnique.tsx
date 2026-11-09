import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Text,
  TextSheet,
  useActionSheet,
} from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { isCustomExercise, type Exercise } from './exercise';
import { linkHost, readVideoUrl } from './exerciseDraft';
import { useExerciseSettings, useSaveExerciseSettings } from './useExerciseSettings';

// How to do an exercise well: its tips and its video, with a small pencil
// on the link to change it. Built-ins are shared, so your link is one of your
// settings and only you see it; on your own exercises it's changed in the
// form. Nothing when there's nothing to show or change.
export function ExerciseTechnique({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { data: settings } = useExerciseSettings();
  const save = useSaveExerciseSettings(exercise.id);
  const showActionSheet = useActionSheet();
  const [editing, setEditing] = useState(false);

  const tips = exercise.technique?.[language] ?? [];
  const yourLink = settings?.[exercise.id]?.videoUrl ?? null;
  const url = yourLink ?? exercise.videoUrl;
  // Once your settings are here, so the sheet opens on your own link.
  const canChange = settings !== undefined && !isCustomExercise(exercise);
  if (tips.length === 0 && !url && !canChange) return null;

  // With a link of your own over a suggested one, there are two ways to go.
  function changeVideo() {
    if (!yourLink || !exercise.videoUrl) {
      setEditing(true);
      return;
    }
    showActionSheet(
      {
        options: [
          t('exercises.detail.changeVideo'),
          t('exercises.detail.useSuggestedVideo'),
          t('common.cancel'),
        ],
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) setEditing(true);
        if (index === 1) save.mutate({ videoUrl: null });
      },
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={t('exercises.detail.technique')} />
      <SettingsCard>
        {tips.length > 0 ? (
          <View style={styles.tips}>
            {tips.map((tip) => (
              <View key={tip} style={styles.tip}>
                <View style={[styles.tipDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {url ? (
          <WatchVideoRow
            url={url}
            trailing={canChange ? <ChangeVideoButton onPress={changeVideo} /> : undefined}
          />
        ) : null}
        {!url && canChange ? (
          <SettingsRow
            icon="link"
            tone="muted"
            label={t('exercises.detail.addVideo')}
            onPress={() => setEditing(true)}
          />
        ) : null}
      </SettingsCard>

      <TextSheet
        visible={editing}
        kind="link"
        title={t('exercises.detail.video')}
        label={t('exercises.detail.video')}
        placeholder={t('exercises.form.videoPlaceholder')}
        value={url ?? ''}
        validate={(text) =>
          readVideoUrl(text) === 'invalid' ? t('exercises.form.errors.videoUrlInvalid') : undefined
        }
        onClose={() => setEditing(false)}
        onDone={(text) => {
          const link = readVideoUrl(text);
          // Empty, or the suggested link itself: nothing of your own to keep.
          save.mutate({ videoUrl: link === 'invalid' || link === exercise.videoUrl ? null : link });
          setEditing(false);
        }}
      />
    </View>
  );
}

// The technique video, opened where it lives: the YouTube or TikTok app,
// or Safari. Playing it inside the app comes with US-27.
function WatchVideoRow({ url, trailing }: { url: string; trailing?: ReactNode }) {
  const { t } = useTranslation();
  const site = linkHost(url);

  return (
    <SettingsRow
      icon="play.rectangle"
      label={t('exercises.detail.video')}
      value={site}
      onPress={() => {
        Linking.openURL(url).catch(() => {});
      }}
      aria-label={t('exercises.detail.watchVideo', { site })}
      trailing={trailing}
    />
  );
}

// A small pencil at the end of the link's row; its tap area is still 48 pt.
function ChangeVideoButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={t('exercises.detail.changeVideo')}
      onPress={onPress}
      style={({ pressed }) => [styles.pencil, pressed && styles.pressed]}>
      <SymbolView name="pencil" size={17} weight="medium" tintColor={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  tips: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // In line with the first line of its tip.
  tipDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  tipText: {
    flex: 1,
  },
  pencil: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
