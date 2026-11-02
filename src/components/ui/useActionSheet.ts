import { menus, type MenuOptions } from './Menu';

// Opens a menu (the app's own, see Menu.tsx) on the top-most layer; `onPick`
// gets the option's index, or Cancel·la's when it's dismissed. A hook so
// screens ask for menus the same way wherever they are.
export function useActionSheet() {
  return (options: MenuOptions, onPick: (index: number) => void) => menus.show(options, onPick);
}
