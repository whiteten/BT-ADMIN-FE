import { fuzzyFilter, fuzzyScore } from '@/shared-util';
import { AUTOCOMPLETE_LIMIT, MENU_RESULT_LIMIT } from '../constants/searchConstants';
import type { MenuSearchResult } from '../types/search';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

/** fuzzy 매칭 대상 — menuConfigs(=권한 스코프된 navi)에서 추출한 leaf(페이지) 메뉴 */
export interface MenuLeaf {
  label: string;
  appId: string;
  menuKey: string;
  breadcrumb: string[];
  path?: string;
}

/**
 * menuConfigs 트리를 leaf(페이지) 목록으로 평탄화한다.
 * - hide 메뉴 제외, path 있는 항목(페이지)만 포함 (폴더 제외)
 * - breadcrumb = [앱명, ...상위 폴더 label] (자기 자신 제외)
 * - path·icon 도 함께 실어 결과 행에서 추가 조회 없이 사용
 */
export const collectMenuLeaves = (configs: MenuConfig[]): MenuLeaf[] => {
  const out: MenuLeaf[] = [];
  for (const config of configs) {
    const walk = (items: MenuItem[], trail: string[]) => {
      for (const item of items) {
        if (item.hide) continue;
        if (item.path) {
          out.push({
            label: item.label,
            appId: config.appId,
            menuKey: item.menuKey,
            breadcrumb: [config.appName, ...trail],
            path: item.path,
          });
        }
        if (item.children) walk(item.children, [...trail, item.label]);
      }
    };
    walk(config.menus, []);
  }
  return out;
};

/** menuKey로 path 역참조 — 결과에 path가 없을 때의 fallback 네비게이션용 */
export const findPathByMenuKey = (configs: MenuConfig[], appId: string, menuKey: string): string | undefined => {
  const config = configs.find((c) => c.appId === appId);
  if (!config) return undefined;
  const search = (items: MenuItem[]): string | undefined => {
    for (const item of items) {
      if (item.menuKey === menuKey) return item.path;
      if (item.children) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  return search(config.menus);
};

/** 메뉴 검색 — fuzzy 필터 + 점수 매핑. MenuSearchResult[] 반환 */
export const searchMenus = (query: string, leaves: MenuLeaf[]): MenuSearchResult[] => {
  if (query.length === 0) return [];
  return fuzzyFilter(query, leaves, (m) => m.label)
    .slice(0, MENU_RESULT_LIMIT)
    .map((m) => ({
      id: `menu:${m.menuKey}`,
      type: 'MENU' as const,
      label: m.label,
      breadcrumb: m.breadcrumb,
      appId: m.appId,
      menuKey: m.menuKey,
      path: m.path,
      score: fuzzyScore(query, m.label),
    }));
};

/** 자동완성 제안 — 메뉴 검색 결과의 라벨만 dedup 후 상위 N개 */
export const buildMenuSuggestions = (query: string, leaves: MenuLeaf[], limit: number = AUTOCOMPLETE_LIMIT): string[] => {
  if (query.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const leaf of fuzzyFilter(query, leaves, (m) => m.label)) {
    if (seen.has(leaf.label)) continue;
    seen.add(leaf.label);
    out.push(leaf.label);
    if (out.length >= limit) break;
  }
  return out;
};
