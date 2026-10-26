import { Screen } from '@/components/ui';
import { Today } from '@/features/schedule/Today';

// Avui has its own header (the date, "Avui" and your picture).
export default function TodayScreen() {
  return (
    <Screen>
      <Today />
    </Screen>
  );
}
