export interface MenuSearchResult {
  id: string;
  type: 'MENU';
  label: string;
  breadcrumb: string[];
  appId: string;
  menuKey: string;
  /** 네비게이션 경로 — leaf 메뉴의 path. FavoriteButton·이동에 사용 */
  path?: string;
  score: number;
}

export interface DocSearchResult {
  id: string;
  type: 'DOC';
  label: string;
  breadcrumb: string[];
  score: number;
  url: string;
}

export interface SearchData {
  query: string;
  total: number;
  docs: DocSearchResult[];
}
