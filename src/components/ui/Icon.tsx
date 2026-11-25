import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import { ArrowsLeftRightIcon } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import { ArrowUUpLeftIcon } from 'phosphor-react-native/src/icons/ArrowUUpLeft';
import { ArrowUUpRightIcon } from 'phosphor-react-native/src/icons/ArrowUUpRight';
import { BarbellIcon } from 'phosphor-react-native/src/icons/Barbell';
import { BasketballIcon } from 'phosphor-react-native/src/icons/Basketball';
import { BicycleIcon } from 'phosphor-react-native/src/icons/Bicycle';
import { CakeIcon } from 'phosphor-react-native/src/icons/Cake';
import { CalendarDotsIcon } from 'phosphor-react-native/src/icons/CalendarDots';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { DotsThreeIcon } from 'phosphor-react-native/src/icons/DotsThree';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { FlagCheckeredIcon } from 'phosphor-react-native/src/icons/FlagCheckered';
import { FlowerLotusIcon } from 'phosphor-react-native/src/icons/FlowerLotus';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { GlobeIcon } from 'phosphor-react-native/src/icons/Globe';
import { HandGrabbingIcon } from 'phosphor-react-native/src/icons/HandGrabbing';
import { HeartbeatIcon } from 'phosphor-react-native/src/icons/Heartbeat';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { LightningIcon } from 'phosphor-react-native/src/icons/Lightning';
import { LinkIcon } from 'phosphor-react-native/src/icons/Link';
import { ListIcon } from 'phosphor-react-native/src/icons/List';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinAreaIcon } from 'phosphor-react-native/src/icons/MapPinArea';
import { MapTrifoldIcon } from 'phosphor-react-native/src/icons/MapTrifold';
import { MonitorPlayIcon } from 'phosphor-react-native/src/icons/MonitorPlay';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { MoonStarsIcon } from 'phosphor-react-native/src/icons/MoonStars';
import { MountainsIcon } from 'phosphor-react-native/src/icons/Mountains';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { NoteIcon } from 'phosphor-react-native/src/icons/Note';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PersonIcon } from 'phosphor-react-native/src/icons/Person';
import { PersonArmsSpreadIcon } from 'phosphor-react-native/src/icons/PersonArmsSpread';
import { PersonSimpleBikeIcon } from 'phosphor-react-native/src/icons/PersonSimpleBike';
import { PersonSimpleHikeIcon } from 'phosphor-react-native/src/icons/PersonSimpleHike';
import { PersonSimpleRunIcon } from 'phosphor-react-native/src/icons/PersonSimpleRun';
import { PersonSimpleSwimIcon } from 'phosphor-react-native/src/icons/PersonSimpleSwim';
import { PersonSimpleThrowIcon } from 'phosphor-react-native/src/icons/PersonSimpleThrow';
import { PersonSimpleWalkIcon } from 'phosphor-react-native/src/icons/PersonSimpleWalk';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { QuotesIcon } from 'phosphor-react-native/src/icons/Quotes';
import { RacquetIcon } from 'phosphor-react-native/src/icons/Racquet';
import { RulerIcon } from 'phosphor-react-native/src/icons/Ruler';
import { ScalesIcon } from 'phosphor-react-native/src/icons/Scales';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { SneakerIcon } from 'phosphor-react-native/src/icons/Sneaker';
import { SneakerMoveIcon } from 'phosphor-react-native/src/icons/SneakerMove';
import { SoccerBallIcon } from 'phosphor-react-native/src/icons/SoccerBall';
import { SquareSplitHorizontalIcon } from 'phosphor-react-native/src/icons/SquareSplitHorizontal';
import { StackIcon } from 'phosphor-react-native/src/icons/Stack';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { TagIcon } from 'phosphor-react-native/src/icons/Tag';
import { TennisBallIcon } from 'phosphor-react-native/src/icons/TennisBall';
import { TimerIcon } from 'phosphor-react-native/src/icons/Timer';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { UsersIcon } from 'phosphor-react-native/src/icons/Users';
import { VolleyballIcon } from 'phosphor-react-native/src/icons/Volleyball';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import type { StyleProp, ViewStyle } from 'react-native';

// The app's icons, drawn as SVG (Phosphor, MIT) so the iPhone and the web
// look the same: SF Symbols' licence keeps them off the web. Each icon is
// imported from its own file; the package's index holds all 1,500, and
// Metro would bundle every one.
//
// The names are the SF Symbols the app used before, so call sites read the
// same. A name ending in ".fill" draws Phosphor's filled weight.
const ICONS = {
  archivebox: ArchiveIcon,
  'arrow.left.arrow.right': ArrowsLeftRightIcon,
  'arrow.uturn.backward': ArrowUUpLeftIcon,
  'arrow.uturn.forward': ArrowUUpRightIcon,
  basketball: BasketballIcon,
  bicycle: BicycleIcon,
  'birthday.cake': CakeIcon,
  bolt: LightningIcon,
  calendar: CalendarDotsIcon,
  camera: CameraIcon,
  'camera.fill': CameraIcon,
  checkmark: CheckIcon,
  'chevron.down': CaretDownIcon,
  'chevron.left': CaretLeftIcon,
  'chevron.right': CaretRightIcon,
  clock: ClockIcon,
  dumbbell: BarbellIcon,
  ellipsis: DotsThreeIcon,
  envelope: EnvelopeSimpleIcon,
  eye: EyeIcon,
  'eye.slash': EyeSlashIcon,
  'figure.climbing': HandGrabbingIcon,
  'figure.dance': MusicNotesIcon,
  'figure.flexibility': PersonArmsSpreadIcon,
  'figure.hiking': PersonSimpleHikeIcon,
  'figure.indoor.cycle': PersonSimpleBikeIcon,
  'figure.open.water.swim': PersonSimpleSwimIcon,
  'figure.pool.swim': PersonSimpleSwimIcon,
  'figure.run': PersonSimpleRunIcon,
  'figure.run.circle': SneakerMoveIcon,
  'figure.stand': PersonIcon,
  'figure.strengthtraining.functional': PersonSimpleThrowIcon,
  'figure.strengthtraining.traditional': BarbellIcon,
  'figure.tennis': TennisBallIcon,
  'figure.walk': PersonSimpleWalkIcon,
  'figure.yoga': FlowerLotusIcon,
  'flag.checkered': FlagCheckeredIcon,
  'forward.end': SkipForwardIcon,
  gearshape: GearSixIcon,
  globe: GlobeIcon,
  'info.circle': InfoIcon,
  key: KeyIcon,
  'line.3.horizontal': ListIcon,
  link: LinkIcon,
  lock: LockIcon,
  'lock.fill': LockIcon,
  magnifyingglass: MagnifyingGlassIcon,
  map: MapTrifoldIcon,
  'mappin.and.ellipse': MapPinAreaIcon,
  moon: MoonIcon,
  'moon.zzz': MoonStarsIcon,
  'mountain.2': MountainsIcon,
  'note.text': NoteIcon,
  pencil: PencilSimpleIcon,
  person: UserIcon,
  'person.2': UsersIcon,
  'play.fill': PlayIcon,
  'play.rectangle': MonitorPlayIcon,
  plus: PlusIcon,
  'rectangle.portrait.and.arrow.right': SignOutIcon,
  'rectangle.split.2x1': SquareSplitHorizontalIcon,
  ruler: RulerIcon,
  scalemass: ScalesIcon,
  shoe: SneakerIcon,
  'slider.horizontal.3': SlidersHorizontalIcon,
  soccerball: SoccerBallIcon,
  'square.stack.3d.up': StackIcon,
  star: StarIcon,
  'star.fill': StarIcon,
  tag: TagIcon,
  'tennis.racket': RacquetIcon,
  'text.quote': QuotesIcon,
  timer: TimerIcon,
  trash: TrashIcon,
  volleyball: VolleyballIcon,
  'waveform.path.ecg': HeartbeatIcon,
  xmark: XIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

// The SF Symbols weights the design was drawn with.
export type IconStroke = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

// Phosphor has fewer weights than SF Symbols: medium reads as regular, and
// semibold as bold.
const WEIGHTS: Record<IconStroke, IconWeight> = {
  light: 'light',
  regular: 'regular',
  medium: 'regular',
  semibold: 'bold',
  bold: 'bold',
};

export type IconProps = {
  name: IconName;
  size: number;
  tintColor: string;
  weight?: IconStroke;
  style?: StyleProp<ViewStyle>;
};

// Decorative: the button or row around it says what it does.
export function Icon({ name, size, tintColor, weight = 'regular', style }: IconProps) {
  const Drawing = ICONS[name];
  return (
    <Drawing
      size={size}
      color={tintColor}
      weight={name.endsWith('.fill') ? 'fill' : WEIGHTS[weight]}
      style={style}
    />
  );
}
