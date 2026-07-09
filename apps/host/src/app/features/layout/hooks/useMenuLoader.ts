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
 * 운영자 메뉴 트리 변환.
 * - operatorMode OFF : featureFlag='operator'(운영자 전용) 메뉴를 트리에서 제거(빈 폴더도 정리).
 * - operatorMode ON  : 트리를 그대로 유지(**폴더로 묶지 않음**). 운영자 전용/영향 메뉴는 제자리에서 렌더 배지로 표기.
 *                      'operator'      → "운영자 전용" 앰버 배지
 *                      'operator-aware'→ "운영시 변경" 보라 배지
 */
const transformOperatorMenus = (menus: MenuItem[], operatorMode: boolean): MenuItem[] => {
  const recurse = (items: MenuItem[]): MenuItem[] => {
    const processed = items.map((m) => (m.children ? { ...m, children: recurse(m.children) } : m));
    if (operatorMode) return processed; // ON: 제자리 유지, 배지로만 표기
    // OFF: operator 전용 제거 + 빈 폴더 정리
    return processed.filter((m) => m.featureFlag !== 'operator').filter((m) => m.path || (m.children && m.children.length > 0));
  };
  return recurse(menus);
};

export function useMenuLoader() {
  const { setMenuConfigs, setIsLoading } = useMenuStore();
  const { apps } = useNavigationStore();
  // 운영자 모드 토글 시 메뉴 재구성(운영자 전용 메뉴 노출/숨김 반영).
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const menuConfigs = apps.map(toMenuConfig).map((c) => ({ ...c, menus: transformOperatorMenus(c.menus, operatorMode) }));
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
