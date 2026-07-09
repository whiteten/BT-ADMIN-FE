import { useCallback } from 'react';
import { Cog } from 'lucide-react';
import { LOG } from '@/log';
import { useMenuStore, useNavigationStore, useOperatorScopeStore } from '@/shared-store';
import { resolveMenuIcon } from '@/components/custom/menuIconRegistry';
import type { NaviApp, NaviMenuItem } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

const Log = new LOG('useMenuLoader');

/** 운영자 전용 메뉴를 모으는 합성 중메뉴(폴더)의 키. */
const OPERATOR_FOLDER_KEY = '__operator_only__';

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
 * - operatorMode OFF : featureFlag='operator'(운영자 전용) 메뉴를 트리에서 제거.
 * - operatorMode ON  : 운영자 전용 메뉴를 원위치에서 떼어내 앱 최상단의 "운영자 전용" 중메뉴(폴더)로 모음.
 * - 'operator-aware'(운영자 모드에서 범위/동작이 달라지는 메뉴)는 항상 제자리 유지(렌더에서 배지 강조).
 * - 자식이 전부 빠져 비게 된 FOLDER 는 함께 제거.
 */
const transformOperatorMenus = (menus: MenuItem[], operatorMode: boolean): MenuItem[] => {
  const collected: MenuItem[] = [];
  const walk = (items: MenuItem[]): MenuItem[] =>
    items
      .map((m) => (m.children ? { ...m, children: walk(m.children) } : m))
      .filter((m) => {
        if (m.featureFlag === 'operator') {
          if (operatorMode) collected.push(m); // ON: 폴더로 모으려고 수집 / OFF: 그냥 제거(숨김)
          return false;
        }
        return true;
      })
      .filter((m) => m.path || (m.children && m.children.length > 0)); // 빈 폴더 제거

  const base = walk(menus);
  if (operatorMode && collected.length > 0) {
    base.push({
      menuKey: OPERATOR_FOLDER_KEY,
      label: '운영자 전용',
      icon: Cog,
      featureFlag: 'operator', // 폴더도 앰버 강조 대상
      children: collected,
    });
  }
  return base;
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
