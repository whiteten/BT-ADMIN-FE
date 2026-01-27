/** 메뉴 타입 */
export type NaviMenuType = 'PAGE' | 'FOLDER';

/** 메뉴 항목 (재귀 구조) */
export interface NaviMenuItem {
  menuKey: string;
  label: string;
  type: NaviMenuType;
  children: NaviMenuItem[];
}

/** 앱 정보 */
export interface NaviApp {
  appId: string;
  appName: string;
  menus: NaviMenuItem[];
}

/** 네비게이션 데이터 */
export interface NavigationData {
  apps: NaviApp[];
  permissions: string[];
  favorites: string[];
}
