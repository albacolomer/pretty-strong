import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { dateKey, formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import type { ProgressPhoto } from './photos';
import { PrivatePhoto } from './PrivatePhoto';
import { useAddProgressPhoto, useDeleteProgressPhoto, usePhotoUrls, useProgressPhotos } from './usePhotos';
import { usePickPhoto } from './usePickPhoto';

const THUMB_WIDTH = 100;
const THUMB_HEIGHT = 132;

// Body → Fotos de progrés (US-28): add one from the camera or the
// library (dated the day it was taken), newest first; tap one to see it
// big. "Compara" puts two side by side.
export function ProgressPhotos() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const today = dateKey(useToday());
  const { data: photos = [], isPending } = useProgressPhotos();
  const { data: urls = {} } = usePhotoUrls(photos.map((photo) => photo.storagePath));
  const add = useAddProgressPhoto();
  const pickPhoto = usePickPhoto();
  const [open, setOpen] = useState<ProgressPhoto | null>(null);
  const short = (date: string) =>
    new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(fromDateKey(date));

  async function addPhoto() {
    const photo = await pickPhoto({ title: t('photos.add') });
    if (!photo) return;
    // Never in the future, whatever the photo says.
    const date = photo.date && photo.date <= today ? photo.date : today;
    add.mutate({ date, base64: photo.base64 });
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="cardTitle" accessibilityRole="header" style={styles.grow}>
          {t('photos.title')}
        </Text>
        {photos.length >= 2 ? (
          <Pressable
            role="button"
            onPress={() => router.push('/profile/photos')}
            hitSlop={8}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text variant="bodyStrong" color="accent">
              {t('photos.compare')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        <Pressable
          role="button"
          aria-label={t('photos.add')}
          onPress={() => void addPhoto()}
          disabled={add.isPending}
          style={({ pressed }) => [
            styles.thumb,
            styles.addTile,
            { borderColor: colors.textMuted },
            pressed && styles.pressed,
          ]}>
          {add.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <SymbolView name="camera" size={22} tintColor={colors.text} />
              <Text variant="caption">{t('photos.addShort')}</Text>
            </>
          )}
        </Pressable>
        {isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            role="button"
            aria-label={t('photos.photoOn', { date: formatDayTitle(fromDateKey(photo.date), language) })}
            onPress={() => setOpen(photo)}
            style={({ pressed }) => pressed && styles.pressed}>
            <PrivatePhoto
              path={photo.storagePath}
              url={urls[photo.storagePath]}
              label=""
              style={styles.thumb}
            />
            <View style={[styles.dateTag, { backgroundColor: colors.surface }]}>
              <Text variant="caption">{short(photo.date)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <PhotoViewer photo={open} url={open ? urls[open.storagePath] : undefined} onClose={() => setOpen(null)} />
    </Card>
  );
}

// One photo, big, with its date; it can be deleted from here. Deleting
// can't be undone (the file goes), so it asks first.
function PhotoViewer({
  photo,
  url,
  onClose,
}: {
  photo: ProgressPhoto | null;
  url: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const insets = useSafeAreaInsets();
  const remove = useDeleteProgressPhoto();

  function confirmDelete(shown: ProgressPhoto) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('photos.deleteTitle'),
        options: [t('photos.delete'), t('common.cancel')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index !== 0) return;
        remove.mutate(shown);
        onClose();
      },
    );
  }

  return (
    <Modal visible={photo !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.viewer, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.sm }]}>
        {photo ? (
          <>
            <Text variant="cardTitle" accessibilityRole="header" style={styles.viewerTitle}>
              {formatDayTitle(fromDateKey(photo.date), language)}
            </Text>
            <PrivatePhoto
              path={photo.storagePath}
              url={url}
              label={t('photos.photoOn', { date: formatDayTitle(fromDateKey(photo.date), language) })}
              fit="contain"
              style={styles.big}
            />
            <View style={styles.viewerButtons}>
              <Button
                label={t('photos.delete')}
                variant="secondary"
                onPress={() => confirmDelete(photo)}
                style={styles.grow}
              />
              <Button label={t('workout.close')} onPress={onClose} style={styles.grow} />
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  link: {
    minHeight: touch.min,
    justifyContent: 'center',
  },
  strip: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radius.input,
  },
  addTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dateTag: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.input,
  },
  viewer: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  viewerTitle: {
    textAlign: 'center',
  },
  big: {
    flex: 1,
    borderRadius: radius.input,
  },
  viewerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
