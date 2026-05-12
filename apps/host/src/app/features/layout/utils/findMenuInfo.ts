import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

export interface MenuLookup {
  icon?: React.ElementType;
  path?: string;
  appName?: string;
  ancestors: string[];
}

const findMenuItemRecursive = (item: MenuItem, menuKey: string, ancestors: string[]): { path?: string; ancestors: string[] } | null => {
  const nextAncestors = [...ancestors, item.label];
  if (item.menuKey === menuKey) return { path: item.path, ancestors: nextAncestors };
  if (item.children) {
    for (const child of item.children) {
      const result = findMenuItemRecursive(child, menuKey, nextAncestors);
      if (result) return result;
    }
  }
  return null;
};

export const findMenuInfo = (menuConfigs: MenuConfig[], bookmark: Bookmark): MenuLookup => {
  for (const config of menuConfigs) {
    if (config.appId !== bookmark.appId) continue;
    for (const menu of config.menus) {
      const result = findMenuItemRecursive(menu, bookmark.menuKey, []);
      if (result) return { icon: menu.icon, path: result.path, appName: config.appName, ancestors: result.ancestors };
    }
  }
  return { ancestors: [] };
};
