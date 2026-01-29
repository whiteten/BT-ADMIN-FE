export interface MenuItem {
  menuId: number;
  label: string;
  path?: string;
  icon?: React.ElementType;
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
