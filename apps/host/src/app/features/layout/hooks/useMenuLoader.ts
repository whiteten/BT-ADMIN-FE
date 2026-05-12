import { useCallback } from 'react';
import { LOG } from '@/log';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import { resolveMenuIcon } from '@/components/custom/menuIconRegistry';
import type { NaviApp, NaviMenuItem } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

const Log = new LOG('useMenuLoader');

const toMenuItem = (navi: NaviMenuItem): MenuItem => {
  const children = navi.children.length > 0 ? navi.children.map(toMenuItem) : undefined;
  return {
    menuKey: navi.menuKey,
    label: navi.label,
    hide: false,
    ...(navi.path ? { path: navi.path } : {}),
    ...(resolveMenuIcon(navi.iconKey) ? { icon: resolveMenuIcon(navi.iconKey) } : {}),
    ...(navi.desc ? { desc: navi.desc } : {}),
    ...(children ? { children } : {}),
  };
};

const toMenuConfig = (app: NaviApp): MenuConfig => ({
  appId: app.appId,
  appName: app.appName,
  ...(resolveMenuIcon(app.iconKey) ? { icon: resolveMenuIcon(app.iconKey) } : {}),
  menus: app.menus.map(toMenuItem),
});

export function useMenuLoader() {
  const { setMenuConfigs, setIsLoading } = useMenuStore();
  const { apps } = useNavigationStore();
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const menuConfigs = apps.map(toMenuConfig);
      setMenuConfigs(menuConfigs);
      Log.debug('Menu configs loaded successfully.', menuConfigs);
    } catch (err) {
      Log.error('Failed to load menu config:', err);
      setMenuConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [setMenuConfigs, setIsLoading, apps]);

  return { load };
}
