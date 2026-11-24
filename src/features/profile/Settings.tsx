import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Text,
  useActionSheet,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { ChangePasswordSheet } from '@/features/auth/ChangePasswordSheet';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { HidePhotosSetting } from '@/features/body/HidePhotosSetting';
import { languages, useAppLanguage } from '@/lib/i18n';
import { DISTANCE_UNITS, LENGTH_UNITS, WEIGHT_UNITS, type Units } from '@/lib/units';
import { spacing } from '@/theme';

import { useUnits, useUpdateUnits } from './useUnits';
import { useUpdateLanguage } from './useUpdateLanguage';

// Profile → Configuració: your account (email, password), your preferences
// (language, units) and privacy (hide progress photos), each saved as soon
// as it's changed; then "Tanca la sessió" on its own at the bottom.
export function Settings() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const showActionSheet = useActionSheet();
  const language = useAppLanguage();
  const updateLanguage = useUpdateLanguage();
  const units = useUnits();
  const updateUnits = useUpdateUnits();
  const [changingPassword, setChangingPassword] = useState(false);

  function pickLanguage() {
    showActionSheet(
      {
        title: t('profile.language'),
        options: [...languages.map((option) => t(`languages.${option}`)), t('common.cancel')],
        cancelButtonIndex: languages.length,
      },
      (index) => {
        const picked = languages[index];
        if (picked && picked !== language) updateLanguage.mutate(picked);
      },
    );
  }

  // One unit out of two, from a menu that names them in full.
  function pickUnit<K extends keyof Units>(kind: K, options: readonly Units[K][]) {
    showActionSheet(
      {
        title: t(`profile.unitKinds.${kind}`),
        options: [...options.map((unit) => t(`units.names.${unit}`)), t('common.cancel')],
        cancelButtonIndex: options.length,
      },
      (index) => {
        const unit = options[index];
        if (unit && unit !== units[kind]) updateUnits.mutate({ ...units, [kind]: unit });
      },
    );
  }

  return (
    <View style={styles.settings}>
      <View style={styles.section}>
        <SectionHeader title={t('settings.account')} />
        <SettingsCard>
          <SettingsRow icon="envelope" label={session?.user.email ?? ''} />
          <SettingsRow
            icon="key"
            label={t('settings.changePassword')}
            onPress={() => setChangingPassword(true)}
          />
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.preferences')} />
        <SettingsCard>
          <SettingsRow
            icon="globe"
            label={t('profile.language')}
            value={t(`languages.${language}`)}
            onPress={pickLanguage}
          />
          <SettingsRow
            icon="scalemass"
            label={t('profile.unitKinds.weight')}
            value={t(`units.short.${units.weight}`)}
            onPress={() => pickUnit('weight', WEIGHT_UNITS)}
          />
          <SettingsRow
            icon="ruler"
            label={t('profile.unitKinds.length')}
            value={t(`units.short.${units.length}`)}
            onPress={() => pickUnit('length', LENGTH_UNITS)}
          />
          <SettingsRow
            icon="map"
            label={t('profile.unitKinds.distance')}
            value={t(`units.short.${units.distance}`)}
            onPress={() => pickUnit('distance', DISTANCE_UNITS)}
          />
        </SettingsCard>
        {updateLanguage.isError ? (
          <Text variant="caption" color="danger" role="alert">
            {t('profile.languageSaveError')}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.privacy')} />
        <SettingsCard>
          <HidePhotosSetting />
        </SettingsCard>
      </View>

      <View style={styles.bottom}>
        <SignOutButton />
        {/* RepDB's licence asks for this exact line, so it isn't translated. */}
        <Text variant="caption" color="textMuted" style={styles.credit}>
          {t('profile.repdbCredit')}
        </Text>
      </View>

      <ChangePasswordSheet visible={changingPassword} onClose={() => setChangingPassword(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  settings: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  // Apart from the settings above.
  bottom: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  credit: {
    textAlign: 'center',
  },
});
