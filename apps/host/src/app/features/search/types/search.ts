export interface MenuSearchResult {
  id: string;
  type: 'MENU';
  label: string;
  breadcrumb: string[];
  appId: string;
  menuKey: string;
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

export type SearchResult = MenuSearchResult | DocSearchResult;

export interface SearchData {
  query: string;
  total: number;
  menus: MenuSearchResult[];
  docs: DocSearchResult[];
}
