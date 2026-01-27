export interface MenuItem {
  menuKey: string;
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
  menus: MenuItem[];
}
