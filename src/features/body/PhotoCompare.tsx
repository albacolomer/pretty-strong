import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { defaultComparison } from './photos';
import { PrivatePhoto } from './PrivatePhoto';
import { useHiddenPhotos } from './usePhotoLock';
import { usePhotoUrls, useProgressPhotos } from './usePhotos';

// Body → Fotos de progrés → Compara (US-28): two photos side by side, the
// oldest and the newest to begin with. Tap a side, then a photo below, to
// put that one there. Hidden photos stay blurred until unlocked.
export function PhotoCompare() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { data: photos = [], isPending } = useProgressPhotos();
  const { data: urls = {} } = usePhotoUrls(photos.map((photo) => photo.storagePath));
  // The two shown, by id; null: the oldest and the newest.
  const [chosen, setChosen] = useState<[string, string] | null>(null);
  const [side, setSide] = useState<0 | 1>(1);
  const { hidden, unlock } = useHiddenPhotos();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  const pair = chosen ?? defaultComparison(photos);
  if (!pair) return <Text color="textMuted">{t('photos.compareNeedsTwo')}</Text>;

  const long = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' });
  const short = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' });
  const shown = pair.map((id) => photos.find((photo) => photo.id === id) ?? photos[0]);

  function choose(id: string) {
    const next: [string, string] = [...pair!] as [string, string];
    next[side] = id;
    setChosen(next);
  }

  return (
    <View style={styles.page}>
      {hidden ? (
        <Button label={t('photos.unlock')} variant="secondary" onPress={() => void unlock()} />
      ) : null}
      <View style={styles.pair}>
        {shown.map((photo, index) => {
          const date = long.format(fromDateKey(photo.date));
          return (
            <Pressable
              key={index}
              role="radio"
              aria-checked={side === index}
              aria-label={t(index === 0 ? 'photos.before' : 'photos.after', { date })}
              onPress={() => setSide(index as 0 | 1)}
              style={[
                styles.side,
                { borderColor: side === index ? colors.accent : 'transparent' },
              ]}>
              <PrivatePhoto
                path={photo.storagePath}
                url={urls[photo.storagePath]}
                label=""
                blurred={hidden}
                style={styles.photo}
              />
              <Text variant="caption" color={side === index ? 'accent' : 'textMuted'} style={styles.date}>
                {date}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" color="textMuted">
        {t('photos.compareHint')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            role="button"
            aria-label={t('photos.putHere', { date: long.format(fromDateKey(photo.date)) })}
            onPress={() => choose(photo.id)}
            style={({ pressed }) => [
              styles.thumbWrap,
              pair.includes(photo.id) && { borderColor: colors.accent },
              pressed && styles.pressed,
            ]}>
            <PrivatePhoto
              path={photo.storagePath}
              url={urls[photo.storagePath]}
              label=""
              blurred={hidden}
              style={styles.thumb}
            />
            <Text variant="caption" color="textMuted" style={styles.date}>
              {short.format(fromDateKey(photo.date))}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.md,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  side: {
    flex: 1,
    gap: spacing.xs,
    padding: 2,
    borderWidth: 2,
    borderRadius: radius.input,
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.input,
  },
  date: {
    textAlign: 'center',
  },
  strip: {
    gap: spacing.sm,
  },
  thumbWrap: {
    gap: 2,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.input,
  },
  thumb: {
    width: 64,
    height: 84,
    borderRadius: radius.input,
  },
  pressed: {
    opacity: 0.75,
  },
});
