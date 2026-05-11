/** 메뉴 타입 */
export type NaviMenuType = 'PAGE' | 'FOLDER';

/**
 * 메뉴 항목 (재귀 구조).
 *
 * IAM 재설계 v2.2: menuId(number) → menuKey(string).
 */
export interface NaviMenuItem {
  menuKey: string;
  label: string;
  type: NaviMenuType;
  path?: string;
  iconKey?: string;
  permissions?: string[];
  children: NaviMenuItem[];
}

/** 앱 정보 */
export interface NaviApp {
  appId: string;
  appName: string;
  iconKey?: string;
  menus: NaviMenuItem[];
}

/** 북마크 정보 */
export interface Bookmark {
  appId: string;
  label: string;
  menuKey: string;
  sortOrder: number;
}

/** 네비게이션 데이터 */
export interface NavigationData {
  apps: NaviApp[];
  permissions: string[];
  favorites: Bookmark[];
}
