import type { Favorite } from '@/shared-api';
import type { MenuConfig, MenuItem } from '@/shared-store';
import { splitPath } from './pathUtils';

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

export const findMenuInfo = (menuConfigs: MenuConfig[], favorite: Favorite): MenuLookup => {
  for (const config of menuConfigs) {
    if (config.appId !== favorite.appId) continue;
    for (const menu of config.menus) {
      const result = findMenuItemRecursive(menu, favorite.menuKey, []);
      if (result) return { icon: menu.icon, path: result.path, appName: config.appName, ancestors: result.ancestors };
    }
  }
  return { ancestors: [] };
};

const findMenuLabelByPathRecursive = (item: MenuItem, relPath: string, search: string): string | undefined => {
  // 메뉴 path는 쿼리스트링 분기 메뉴면 `path?key=value`로 저장된다(같은 pathname을 공유하는 분기들).
  // pathname은 일치 필수, query는 분기 메뉴(itemSearch 있음)일 때만 정확히 일치해야 분기끼리 라벨이 안 섞인다.
  // 비분기 메뉴(itemSearch 없음)는 url의 부수적 query를 무시하고 pathname만으로 매칭(기존 동작 보존).
  const { pathname: itemPath, search: itemSearch } = splitPath(item.path ?? '');
  if (itemPath === relPath && (itemSearch === '' || itemSearch === search)) return item.label;
  if (item.children) {
    for (const child of item.children) {
      const result = findMenuLabelByPathRecursive(child, relPath, search);
      if (result) return result;
    }
  }
  return undefined;
};

/**
 * appId + 상대경로(relPath, appId 세그먼트 제외·앞 슬래시 없음) + search(쿼리스트링, '?' 포함)로 메뉴 라벨을
 * 역방향 조회한다. 탭 라벨 도출용 — 메뉴 항목이면 라벨을, 아니면(상세 등) appName만 돌려준다(breadcrumb로 정밀화).
 * 쿼리스트링 분기 메뉴는 query까지 일치해야 분기별 라벨이 정확히 도출된다.
 */
export const findMenuByPath = (menuConfigs: MenuConfig[], appId: string, relPath: string, search = ''): { label?: string; appName?: string } => {
  for (const config of menuConfigs) {
    if (config.appId !== appId) continue;
    for (const menu of config.menus) {
      const label = findMenuLabelByPathRecursive(menu, relPath, search);
      if (label) return { label, appName: config.appName };
    }
    return { appName: config.appName };
  }
  return {};
};
