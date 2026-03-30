import { useCallback } from 'react';
import _ from 'lodash';
import { LOG } from '@/log';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import type { NaviApp, NaviMenuItem } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

const Log = new LOG('useMenuLoader');

type MenuModule = { default: MenuConfig | Record<string, never> };

const MENU_LOADERS: Record<string, () => Promise<MenuModule>> = {
  manager: () => import('manager/MenuConfig').catch(() => ({ default: {} })) as Promise<MenuModule>,
  fca: () => import('fca/MenuConfig').catch(() => ({ default: {} })) as Promise<MenuModule>,
  dashboard: () => import('dashboard/MenuConfig').catch(() => ({ default: {} })) as Promise<MenuModule>,
};

/** NaviApp[]에서 모든 menuId → label 매핑을 재귀적으로 수집 */
const collectMenuMap = (apps: NaviApp[]): Map<number, string> => {
  const map = new Map<number, string>();
  const collect = (items: NaviMenuItem[]) => {
    for (const item of items) {
      map.set(item.menuId, item.label);
      if (item.children.length > 0) collect(item.children);
    }
  };
  for (const app of apps) collect(app.menus);
  return map;
};

/** MenuItem[]를 재귀 순회하며 menuMap 기반으로 hide/label 적용 */
const applyMenuVisibility = (menus: MenuItem[], menuMap: Map<number, string>): MenuItem[] => {
  return menus.map((item) => {
    const naviLabel = menuMap.get(item.menuId);
    return {
      ...item,
      hide: !menuMap.has(item.menuId),
      ...(naviLabel ? { label: naviLabel } : {}),
      ...(item.children && item.children.length > 0 ? { children: applyMenuVisibility(item.children, menuMap) } : {}),
    };
  });
};

const loadMenuConfigs = async () => {
  const configs = await Promise.all(
    Object.values(MENU_LOADERS).map(async (loader) => {
      const menuModule = await loader();
      return menuModule.default;
    }),
  );
  return configs;
};

/**
 * 메뉴 아이템을 정렬하고 숨김 처리된 항목을 필터링합니다.
 * - hide가 true인 항목 제외
 * - index(오름차순) → label(오름차순) 기준 정렬
 * - 자식이 모두 필터링되면 부모도 제외 (단일 순회)
 */
const processMenuItems = (menus: MenuItem[]): MenuItem[] => {
  return _.orderBy(menus, ['index', 'label'], ['asc', 'asc'])
    .filter((item) => !item.hide)
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const processedChildren = processMenuItems(item.children);
        if (processedChildren.length === 0) return null;
        return { ...item, children: processedChildren };
      }
      return item;
    })
    .filter((item): item is MenuItem => item !== null);
};

export function useMenuLoader() {
  const { setMenuConfigs, setIsLoading } = useMenuStore();
  const { apps } = useNavigationStore();
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedMenuConfigs = await loadMenuConfigs();
      const menuMap = collectMenuMap(apps);
      const appNameMap = new Map(apps.map((app) => [app.appId, app.appName]));

      const menuConfigs = loadedMenuConfigs
        .filter((menuConfig) => !_.isEmpty(menuConfig))
        .map((menuConfig) => {
          const mc = menuConfig as MenuConfig;
          const naviApp = appNameMap.get(mc.appId);
          return {
            ...mc,
            ...(naviApp ? { appName: naviApp } : {}),
            menus: applyMenuVisibility(mc.menus, menuMap),
          };
        })
        .map((menuConfig) => ({
          ...menuConfig,
          menus: processMenuItems((menuConfig as MenuConfig).menus),
        }));

      setMenuConfigs(menuConfigs as MenuConfig[]);
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
