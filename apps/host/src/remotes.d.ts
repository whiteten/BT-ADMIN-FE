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
    appId: string;
    appName: string;
    menus: MenuItem[];
  }

  const menuConfig: MenuConfig;
  export default menuConfig;
}

declare module '*/Routes' {
  import type { RouteObject } from 'react-router-dom';
  export const routes: RouteObject[];
}
