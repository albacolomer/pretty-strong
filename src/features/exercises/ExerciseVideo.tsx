import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { SettingsCard, SettingsRow, TextSheet } from '@/components/ui';

import { isCustomExercise, type Exercise } from './exercise';
import { linkHost, readVideoUrl } from './exerciseDraft';
import { useExerciseSettings, useSaveExerciseSettings } from './useExerciseSettings';

// The technique video, opened where it lives: the YouTube or TikTok app,
// or Safari. Playing it inside the app comes with US-27. Built-ins are
// shared, so your own link is one of your settings and only you see it;
// on your own exercises the link is changed in the form.
export function ExerciseVideo({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const { data: settings } = useExerciseSettings();
  const save = useSaveExerciseSettings(exercise.id);
  const [editing, setEditing] = useState(false);

  const yourLink = settings?.[exercise.id]?.videoUrl ?? null;
  const url = yourLink ?? exercise.videoUrl;
  const canChange = !isCustomExercise(exercise);
  if (!url && !canChange) return null;
  const site = url ? linkHost(url) : '';

  return (
    <>
      <SettingsCard>
        {url ? (
          <SettingsRow
            icon="play.rectangle"
            label={t('exercises.detail.video')}
            value={site}
            onPress={() => {
              Linking.openURL(url).catch(() => {});
            }}
            aria-label={t('exercises.detail.watchVideo', { site })}
          />
        ) : null}
        {canChange ? (
          <SettingsRow
            icon="pencil"
            tone="muted"
            label={t(url ? 'exercises.detail.changeVideo' : 'exercises.detail.addVideo')}
            onPress={() => setEditing(true)}
          />
        ) : null}
        {yourLink && exercise.videoUrl ? (
          <SettingsRow
            icon="arrow.uturn.backward"
            tone="muted"
            label={t('exercises.detail.useSuggestedVideo')}
            onPress={() => save.mutate({ videoUrl: null })}
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
    </>
  );
}
