/**
 * 권한 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { permissionApi } from '../api/permissionApi';
import type { MenuWithPermissions, Permission, PermissionCreateRequest, PermissionFlat, PermissionGroup } from '../types/iam.types';

/**
 * 메뉴 목록을 앱별로 그룹화
 * appName은 백엔드에서 AppEntity JOIN으로 제공
 */
function groupMenusByApp(menus: MenuWithPermissions[]): PermissionGroup[] {
  const grouped = menus.reduce(
    (acc, menu) => {
      if (!acc[menu.appId]) {
        acc[menu.appId] = { appName: menu.appName, menus: [] };
      }
      acc[menu.appId].menus.push(menu);
      return acc;
    },
    {} as Record<string, { appName: string; menus: MenuWithPermissions[] }>,
  );

  return Object.entries(grouped).map(([appId, { appName, menus: menuList }]) => ({
    appId,
    appName: appName || appId,
    menus: menuList,
  }));
}

export const permissionQueryKeys = createQueryKeys('permissions', {
  getGroupedPermissions: null,
  getAuthList: null,
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

/**
 * 권한 Flat 목록 조회 훅
 * - 메뉴 정보를 포함한 Flat 형식의 권한 목록
 */
export const useGetAuthList = ({ queryOptions }: QueryHookOptions<PermissionFlat[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getAuthList.queryKey,
    queryFn: permissionApi.getAuthList,
    ...queryOptions,
  });
};

/**
 * 권한 생성 훅
 */
export const useCreatePermission = ({ mutationOptions }: MutationHookOptions<Permission, PermissionCreateRequest> = {}) => {
  return useMutation({
    mutationFn: permissionApi.create,
    ...mutationOptions,
  });
};

/**
 * 권한 삭제 훅
 */
export const useDeletePermission = ({ mutationOptions }: MutationHookOptions<void, string> = {}) => {
  return useMutation({
    mutationFn: permissionApi.delete,
    ...mutationOptions,
  });
};
