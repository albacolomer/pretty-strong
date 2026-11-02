import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, environment, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Sheet, Text, TextField } from '@/components/ui';
import { dateKey, fromDateKey } from '@/features/schedule/dates';
import { IconChoice } from '@/features/schedule/SportGrid';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, touch, useTheme } from '@/theme';

import {
  draftFrom,
  emptyDraft,
  EVENT_ICONS,
  EVENT_KINDS,
  EVENT_NAME_MAX_LENGTH,
  EVENT_NOTES_MAX_LENGTH,
  EVENT_PLACE_MAX_LENGTH,
  eventFromDraft,
  isDraftReady,
  type CalendarEvent,
  type EventDraft,
} from './events';
import { useSaveEvent } from './useEvents';

// Profile → Calendar → "+ Afegeix un esdeveniment" (on `date`), or an
// event's Edita (US-30): what it is, its name, day, place and notes. The
// day uses iOS's own date picker. Give it a new key for each opening, so it
// starts afresh.
export function EventSheet({
  visible,
  event,
  date,
  onClose,
}: {
  visible: boolean;
  // Null: a new one.
  event: CalendarEvent | null;
  date: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const save = useSaveEvent();
  const [draft, setDraft] = useState<EventDraft>(() => (event ? draftFrom(event) : emptyDraft(date)));
  const change = (values: Partial<EventDraft>) => setDraft((current) => ({ ...current, ...values }));

  return (
    <Sheet
      visible={visible}
      title={event ? t('events.editTitle') : t('events.newTitle')}
      onCancel={onClose}
      saveLabel={t('events.save')}
      saveDisabled={!isDraftReady(draft)}
      onSave={() => {
        const saved = eventFromDraft(draft, event?.id ?? randomUUID());
        if (!saved) return;
        save.mutate(saved);
        onClose();
      }}>
      <View role="radiogroup" aria-label={t('events.kind')} style={styles.grid}>
        {EVENT_KINDS.map((kind) => (
          <IconChoice
            key={kind}
            icon={EVENT_ICONS[kind]}
            label={t(`events.kinds.${kind}`)}
            selected={kind === draft.kind}
            onPress={() => change({ kind })}
          />
        ))}
      </View>
      <TextField
        label={draft.kind === 'other' ? t('events.name') : t('events.nameOptional')}
        placeholder={t('events.namePlaceholder')}
        value={draft.name}
        onChangeText={(name) => change({ name })}
        maxLength={EVENT_NAME_MAX_LENGTH}
      />
      <View style={styles.dateRow}>
        <Text>{t('events.date')}</Text>
        <Host matchContents alignment="trailing" colorScheme={scheme} seedColor={colors.accent}>
          <DatePicker
            selection={fromDateKey(draft.date)}
            onDateChange={(picked) => change({ date: dateKey(picked) })}
            modifiers={[
              datePickerStyle('compact'),
              labelsHidden(),
              environment('locale', language),
            ]}
          />
        </Host>
      </View>
      <TextField
        label={t('events.place')}
        placeholder={t('events.placePlaceholder')}
        value={draft.place}
        onChangeText={(place) => change({ place })}
        maxLength={EVENT_PLACE_MAX_LENGTH}
      />
      <TextField
        label={t('events.notes')}
        placeholder={t('events.notesPlaceholder')}
        value={draft.notes}
        onChangeText={(notes) => change({ notes })}
        maxLength={EVENT_NOTES_MAX_LENGTH}
        multiline
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
});
