import type { ReactNode } from 'react';
import { Modal } from 'react-native';

export type PageSheetProps = {
  visible: boolean;
  // Swiping it down, or the system back gesture.
  onRequestClose: () => void;
  // Once it has finished closing.
  onDismiss?: () => void;
  // Fills the sheet: give the root view flex 1 and the background.
  children: ReactNode;
};

// iOS's page sheet: slides up over the screen, which steps back behind it.
// The web draws a look-alike (PageSheet.web.tsx).
export function PageSheet({ visible, onRequestClose, onDismiss, children }: PageSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}>
      {children}
    </Modal>
  );
}
