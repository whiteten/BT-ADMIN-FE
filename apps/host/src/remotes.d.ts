declare module '*/Module' {
  const Module: React.ComponentType;
  export default Module;
}

declare module '*/MenuConfig' {
  interface MenuItem {
    label: string;
    path: string;
    icon?: string;
    children?: MenuItem[];
  }

  interface MenuConfig {
    groupLabel: string;
    items: MenuItem[];
  }

  const menuConfig: MenuConfig;
  export default menuConfig;
}
