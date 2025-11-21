export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: React.ElementType;
  index?: number;
  hide?: boolean;
  children?: MenuItem[];
}

export interface MenuConfig {
  groupLabel: string;
  items: MenuItem[];
}

// Host에서만 사용하는 내부 타입 (rootPath 포함)
export interface MenuConfigWithRootPath extends MenuConfig {
  rootPath: string;
}
