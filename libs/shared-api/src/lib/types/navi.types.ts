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
  desc?: string;
  /** 기능 플래그. 'operator' = 운영자 모드일 때만 노출(사이드바가 operatorMode OFF 시 숨김). */
  featureFlag?: string;
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

/** 즐겨찾기 정보 */
export interface Favorite {
  appId: string;
  label: string;
  menuKey: string;
  sortOrder: number;
}

/** 네비게이션 데이터 */
export interface NavigationData {
  apps: NaviApp[];
  permissions: string[];
  favorites: Favorite[];
}
