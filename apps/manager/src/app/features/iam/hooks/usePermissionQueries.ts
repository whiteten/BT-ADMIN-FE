/**
 * 권한 관리 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions } from '@/shared-util';
import { permissionApi } from '../api/permissionApi';
import type { MenuWithPermissions, PermissionGroup } from '../types/iam.types';

// 앱 이름 매핑
const APP_NAME_MAP: Record<string, string> = {
  manager: 'Manager',
  fca: 'FCA',
  BOT: '챗봇 관리',
  IC: '인바운드 콜',
  IR: 'IVR 관리',
  CM: '공통 관리',
};

/**
 * 메뉴 목록을 앱별로 그룹화
 */
function groupMenusByApp(menus: MenuWithPermissions[]): PermissionGroup[] {
  const grouped = menus.reduce(
    (acc, menu) => {
      if (!acc[menu.appId]) {
        acc[menu.appId] = [];
      }
      acc[menu.appId].push(menu);
      return acc;
    },
    {} as Record<string, MenuWithPermissions[]>,
  );

  return Object.entries(grouped).map(([appId, menuList]) => ({
    appId,
    appName: APP_NAME_MAP[appId] || appId,
    menus: menuList,
  }));
}

export const permissionQueryKeys = createQueryKeys('permissions', {
  getGroupedPermissions: null,
});

/**
 * 그룹화된 권한 목록 조회 훅
 * - 백엔드에서 메뉴별 권한 목록을 받아 앱별로 그룹화
 */
export const useGetGroupedPermissions = ({ queryOptions }: QueryHookOptions<PermissionGroup[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getGroupedPermissions.queryKey,
    queryFn: async () => {
      const menus = await permissionApi.getMenusWithPermissions();
      return groupMenusByApp(menus);
    },
    ...queryOptions,
  });
};
