import { useCallback } from 'react';
import { LOG } from '@/log';
import { useMenuStore, useNavigationStore, useOperatorScopeStore } from '@/shared-store';
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
    ...(navi.featureFlag ? { featureFlag: navi.featureFlag } : {}),
    ...(children ? { children } : {}),
  };
};

const toMenuConfig = (app: NaviApp): MenuConfig => ({
  appId: app.appId,
  appName: app.appName,
  ...(resolveMenuIcon(app.iconKey) ? { icon: resolveMenuIcon(app.iconKey) } : {}),
  menus: app.menus.map(toMenuItem),
});

/**
 * 운영자 전용 메뉴(featureFlag='operator') 필터.
 * operatorMode OFF 시 제외. 'operator-aware'(운영자 모드에서 동작이 달라지는 메뉴)는 항상 유지(강조만 렌더에서 처리).
 * featureFlag 로 비워진 FOLDER(하위 전부 숨김)도 함께 제거.
 */
const filterOperatorMenus = (items: MenuItem[], operatorMode: boolean): MenuItem[] =>
  items
    .filter((m) => operatorMode || m.featureFlag !== 'operator')
    .map((m) => (m.children ? { ...m, children: filterOperatorMenus(m.children, operatorMode) } : m))
    .filter((m) => m.path || (m.children && m.children.length > 0));

export function useMenuLoader() {
  const { setMenuConfigs, setIsLoading } = useMenuStore();
  const { apps } = useNavigationStore();
  // 운영자 모드 토글 시 메뉴 재구성(운영자 전용 메뉴 노출/숨김 반영).
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const menuConfigs = apps.map(toMenuConfig).map((c) => ({ ...c, menus: filterOperatorMenus(c.menus, operatorMode) }));
      setMenuConfigs(menuConfigs);
      Log.debug('Menu configs loaded successfully.', menuConfigs);
    } catch (err) {
      Log.error('Failed to load menu config:', err);
      setMenuConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [setMenuConfigs, setIsLoading, apps, operatorMode]);

  return { load };
}
