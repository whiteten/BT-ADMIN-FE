import { useCallback } from 'react';
import _ from 'lodash';
import { LOG } from '@/log';
import { useMenuStore } from '@/shared-store';
import type { MenuConfig, MenuConfigWithRootPath, MenuItem } from '@/libs/shared-store/src/types/menu.types';

const Log = new LOG('useMenuLoader');

type MenuModule = { default: MenuConfig | Record<string, never> };

const MENU_LOADERS: Record<string, () => Promise<MenuModule>> = {
  core: () => import('core/MenuConfig').catch(() => ({ default: {} })) as Promise<MenuModule>,
  bot: () => import('bot/MenuConfig').catch(() => ({ default: {} })) as Promise<MenuModule>,
};

const loadMenuConfigs = async () => {
  const configs = await Promise.all(
    Object.entries(MENU_LOADERS).map(async ([rootPath, loader]) => {
      const menuModule = await loader();
      if (_.isEmpty(menuModule.default)) {
        return menuModule.default;
      }
      return { ...menuModule.default, rootPath } as MenuConfigWithRootPath;
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
const processMenuItems = (items: MenuItem[]): MenuItem[] => {
  return _.orderBy(items, ['index', 'label'], ['asc', 'asc'])
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

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedMenuConfigs = await loadMenuConfigs();

      const menuConfigs = loadedMenuConfigs
        .filter((menuConfig) => !_.isEmpty(menuConfig))
        .map((menuConfig) => ({
          ...menuConfig,
          items: processMenuItems(menuConfig.items),
        }))
        .filter((menuConfig) => menuConfig.items.length > 0);

      setMenuConfigs(menuConfigs as MenuConfigWithRootPath[]);
      Log.debug('Menu configs loaded successfully.', menuConfigs);
    } catch (err) {
      Log.error('Failed to load menu config:', err);
      setMenuConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [setMenuConfigs, setIsLoading]);

  return { load };
}
