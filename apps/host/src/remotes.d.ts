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

declare module 'core/RoleHooks' {
  import type { UseQueryResult } from '@tanstack/react-query';
  import type { QueryHookWithParamsOptions } from '@/shared-util';

  export interface Role {
    roleId: number;
    roleCode: string;
    roleName: string;
    description?: string;
    sortOrder: number;
    isUse: boolean;
  }

  export function useGetRoles(options?: QueryHookWithParamsOptions<Role[]>): UseQueryResult<Role[], Error>;
}
