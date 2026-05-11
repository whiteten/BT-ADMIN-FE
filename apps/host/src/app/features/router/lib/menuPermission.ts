import type { NaviApp, NaviMenuItem } from '@/libs/shared-api/src/lib/types/navi.types';

type LocationLike = { pathname: string; search: string };

/**
 * 메뉴 path가 현재 location과 매칭되는지 판단한다.
 * MenuItem.tsx의 isMenuActive와 동일한 규칙을 사용한다.
 *
 * - '/list'로 끝나는 메뉴: base path(list 제외) 하위 경로 전체와 매치
 * - 그 외: 해당 경로의 정확 매치 또는 하위 경로 매치
 * - menuPath에 query가 있으면(`path?key=value`): 현재 URL의 searchParams가
 *   menuPath의 모든 (k, v)를 포함해야 매치
 */
export const isMenuPathMatch = (menuPath: string, location: LocationLike, appId: string): boolean => {
  const prefix = `/${appId}/`;
  if (!location.pathname.startsWith(prefix)) return false;
  const relativePath = location.pathname.slice(prefix.length);

  const qIndex = menuPath.indexOf('?');
  const menuPathname = qIndex < 0 ? menuPath : menuPath.slice(0, qIndex);
  const menuSearch = qIndex < 0 ? '' : menuPath.slice(qIndex + 1);

  const pathnameMatched = menuPathname.endsWith('/list')
    ? relativePath === menuPathname.slice(0, -'/list'.length) || relativePath.startsWith(menuPathname.slice(0, -'/list'.length) + '/')
    : relativePath === menuPathname || relativePath.startsWith(menuPathname + '/');

  if (!pathnameMatched) return false;
  if (!menuSearch) return true;

  const menuParams = new URLSearchParams(menuSearch);
  const currentParams = new URLSearchParams(location.search);
  return [...menuParams].every(([k, v]) => currentParams.get(k) === v);
};

/**
 * location에 해당하는 NaviMenuItem 찾기.
 * query까지 일치하는 메뉴를 우선 매치하고, 없으면 path만 일치하는 첫 메뉴를 반환한다.
 */
export const findMenuByLocation = (apps: NaviApp[], location: LocationLike): NaviMenuItem | undefined => {
  const segments = location.pathname.split('/').filter(Boolean);
  const appId = segments[0];
  if (!appId) return undefined;
  const app = apps.find((a) => a.appId === appId);
  if (!app) return undefined;

  let queryFallback: NaviMenuItem | undefined;

  const search = (menus: NaviMenuItem[]): NaviMenuItem | undefined => {
    for (const m of menus) {
      if (m.path) {
        if (isMenuPathMatch(m.path, location, appId)) return m;
        if (!queryFallback && isMenuPathMatch(m.path.split('?')[0], location, appId)) {
          queryFallback = m;
        }
      }
      if (m.children?.length) {
        const found = search(m.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  return search(app.menus) ?? queryFallback;
};

/** 사용자가 메뉴의 모든 필수 권한을 보유하는지 (AND 매칭) */
export const hasAllPermissions = (userPermissions: string[], required: string[] | undefined): boolean => {
  if (!required || required.length === 0) return true;
  const set = new Set(userPermissions);
  return required.every((p) => set.has(p));
};
