import { AppTabs } from '@/components/navigation/AppTabs';
import { useSyncProfileLanguage } from '@/features/profile/useSyncProfileLanguage';
import { useSyncProfileUnits } from '@/features/profile/useUnits';
import { useLockPhotosInBackground } from '@/features/body/usePhotoLock';
import { useSaveDailySteps } from '@/features/steps/useSaveDailySteps';
import { useSaveFinishedWorkouts } from '@/features/workout/useSaveFinishedWorkouts';

export default function TabsLayout() {
  useSyncProfileLanguage();
  useSyncProfileUnits();
  // Finished workouts reach the database whatever tab is open.
  useSaveFinishedWorkouts();
  // The phone forgets steps after a week; the calendar keeps them.
  useSaveDailySteps();
  // Hidden progress photos hide again when the app goes to the background.
  useLockPhotosInBackground();

  return <AppTabs />;
}
