import type { Equipment } from './vocabulary';

// Simple equipment pictures, drawn for Pretty Strong on a 48×48 grid in the
// same rounded style as the logo. `currentColor` is replaced by the colour
// passed to <EquipmentIcon>, so they follow the theme.
const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

export const EQUIPMENT_ICONS: Record<Equipment, string> = {
  barbell: `
    <rect x="3" y="22.5" width="42" height="3" rx="1.5" fill="currentColor"/>
    <rect x="8" y="12" width="5" height="24" rx="2.5" fill="currentColor"/>
    <rect x="14" y="15.5" width="3.5" height="17" rx="1.75" fill="currentColor"/>
    <rect x="35" y="12" width="5" height="24" rx="2.5" fill="currentColor"/>
    <rect x="30.5" y="15.5" width="3.5" height="17" rx="1.75" fill="currentColor"/>`,
  dumbbell: `
    <rect x="15" y="21.5" width="18" height="5" rx="2.5" fill="currentColor"/>
    <rect x="8" y="13" width="8" height="22" rx="3" fill="currentColor"/>
    <rect x="32" y="13" width="8" height="22" rx="3" fill="currentColor"/>
    <rect x="4" y="18" width="5" height="12" rx="2.5" fill="currentColor"/>
    <rect x="39" y="18" width="5" height="12" rx="2.5" fill="currentColor"/>`,
  kettlebell: `
    <path d="M12 25 V16 C12 9.5 17 6.5 24 6.5 C31 6.5 36 9.5 36 16 V25" ${STROKE} stroke-width="5"/>
    <path d="M24 43 C14 43 8 37.5 8 30.5 C8 23.5 14 19 24 19 C34 19 40 23.5 40 30.5 C40 37.5 34 43 24 43 Z" fill="currentColor"/>`,
  machine: `
    <rect x="12" y="5" width="24" height="38" rx="4" ${STROKE} stroke-width="3"/>
    <rect x="16" y="22" width="16" height="4" rx="1.5" fill="currentColor"/>
    <rect x="16" y="28" width="16" height="4" rx="1.5" fill="currentColor"/>
    <rect x="16" y="34" width="16" height="4" rx="1.5" fill="currentColor"/>
    <path d="M24 9 V19" ${STROKE} stroke-width="3"/>`,
  cable: `
    <rect x="6" y="4" width="5" height="40" rx="2.5" fill="currentColor"/>
    <path d="M11 9 H15" ${STROKE} stroke-width="3"/>
    <circle cx="19" cy="9" r="4.5" ${STROKE} stroke-width="3"/>
    <path d="M22 12 L33 31" ${STROKE} stroke-width="2.5"/>
    <path d="M27 31 H40 V35 C40 37 38.5 38.5 36.5 38.5 H30.5 C28.5 38.5 27 37 27 35 Z" ${STROKE} stroke-width="3"/>`,
  smith_machine: `
    <rect x="7" y="4" width="4" height="40" rx="2" fill="currentColor"/>
    <rect x="37" y="4" width="4" height="40" rx="2" fill="currentColor"/>
    <rect x="4" y="20" width="40" height="3" rx="1.5" fill="currentColor"/>
    <rect x="14" y="13" width="4" height="17" rx="2" fill="currentColor"/>
    <rect x="30" y="13" width="4" height="17" rx="2" fill="currentColor"/>`,
  band: `
    <rect x="6" y="15" width="36" height="18" rx="9" ${STROKE} stroke-width="5"/>`,
  medicine_ball: `
    <circle cx="24" cy="24" r="17" ${STROKE} stroke-width="3.5"/>
    <path d="M7.5 24 H40.5 M24 7 C16 14 16 34 24 41 M24 7 C32 14 32 34 24 41" ${STROKE} stroke-width="2.5"/>`,
  sandbag: `
    <path d="M14 18 C14 10 21 10 21 18 M27 18 C27 10 34 10 34 18" ${STROKE} stroke-width="3.5"/>
    <rect x="6" y="17" width="36" height="23" rx="9" fill="currentColor"/>`,
  sled: `
    <rect x="4" y="36" width="40" height="4" rx="2" fill="currentColor"/>
    <rect x="11" y="29" width="26" height="6" rx="2" fill="currentColor"/>
    <rect x="13" y="8" width="4" height="22" rx="2" fill="currentColor"/>
    <rect x="31" y="8" width="4" height="22" rx="2" fill="currentColor"/>
    <path d="M9 9 H39" ${STROKE} stroke-width="3.5"/>`,
  plate: `
    <circle cx="24" cy="24" r="17" ${STROKE} stroke-width="5"/>
    <circle cx="24" cy="24" r="8" ${STROKE} stroke-width="2.5"/>
    <circle cx="24" cy="24" r="2.5" fill="currentColor"/>`,
  ski_erg: `
    <rect x="19" y="4" width="10" height="37" rx="3" fill="currentColor"/>
    <rect x="11" y="40" width="26" height="4" rx="2" fill="currentColor"/>
    <path d="M10 8 H38 M11 8 V20 M37 8 V20" ${STROKE} stroke-width="2.5"/>
    <path d="M11 21 V28 M37 21 V28" ${STROKE} stroke-width="5"/>`,
  rower: `
    <rect x="4" y="35" width="40" height="3.5" rx="1.75" fill="currentColor"/>
    <circle cx="37" cy="25" r="7" ${STROKE} stroke-width="3"/>
    <rect x="13" y="29" width="11" height="5" rx="2.5" fill="currentColor"/>
    <path d="M30 26 H22 M7 38.5 V42 M41 38.5 V42" ${STROKE} stroke-width="3"/>`,
  treadmill: `
    <path d="M4 40 L36 34" ${STROKE} stroke-width="5"/>
    <path d="M36 34 L37 12 M37 14 L27 16" ${STROKE} stroke-width="3"/>
    <rect x="31" y="6" width="12" height="7" rx="2" fill="currentColor"/>`,
  stair_climber: `
    <path d="M5 42 H16 V33 H25 V24 H34 V15 H43" ${STROKE} stroke-width="4"/>
    <path d="M9 28 L31 7" ${STROKE} stroke-width="2.5"/>`,
  bike: `
    <rect x="5" y="40" width="38" height="3.5" rx="1.75" fill="currentColor"/>
    <circle cx="14" cy="30" r="8" ${STROKE} stroke-width="3"/>
    <path d="M30 40 L28 17 M14 30 L28 26 M14 30 L12 12 M8 12 H17" ${STROKE} stroke-width="3"/>
    <rect x="24" y="13" width="12" height="4" rx="2" fill="currentColor"/>`,
  none: `
    <circle cx="24" cy="9" r="5" fill="currentColor"/>
    <path d="M24 17 V30 M12 26 L24 19 L36 26 M24 30 L17 42 M24 30 L31 42" ${STROKE} stroke-width="4"/>`,
};
