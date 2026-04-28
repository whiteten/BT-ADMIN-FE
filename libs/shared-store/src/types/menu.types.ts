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
  componentKey?: string;
  index?: number;
  hide?: boolean;
  children?: MenuItem[];
}

export interface MenuConfig {
  appId: string;
  appName: string;
  icon?: React.ElementType;
  menus: MenuItem[];
}
