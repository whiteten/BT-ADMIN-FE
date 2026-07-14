/**
 * 메뉴 트리 아이템.
 *
 * IAM 재설계 v2.2: menuId(number) → menuKey(string).
 */
export interface MenuItem {
  menuKey: string;
  label: string;
  path?: string;
  icon?: React.ElementType;
  desc?: string;
  index?: number;
  hide?: boolean;
  /**
   * 기능 플래그.
   * - 'operator'       : 운영자 전용 — operatorMode OFF 시 사이드바에서 숨김.
   * - 'operator-aware' : 항상 노출하되 operatorMode ON 시 앰버 강조(운영자 모드에서 동작이 달라지는 메뉴).
   */
  featureFlag?: string;
  children?: MenuItem[];
}

export interface MenuConfig {
  appId: string;
  appName: string;
  icon?: React.ElementType;
  menus: MenuItem[];
}
