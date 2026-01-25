/**
 * 권한 관리 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type PermissionSearchParams, permissionApi } from '../api/permissionApi';
import type { Permission, PermissionGroup } from '../types/iam.types';

// 앱 이름 매핑
const APP_NAME_MAP: Record<string, string> = {
  BOT: '챗봇 관리',
  IC: '인바운드 콜',
  IR: 'IVR 관리',
  CM: '공통 관리',
};

/**
 * 권한 목록을 앱/도메인별로 그룹화
 */
function groupPermissionsByApp(permissions: Permission[]): PermissionGroup[] {
  const grouped = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.appId]) {
        acc[perm.appId] = {};
      }
      if (!acc[perm.appId][perm.domain]) {
        acc[perm.appId][perm.domain] = [];
      }
      acc[perm.appId][perm.domain].push(perm);
      return acc;
    },
    {} as Record<string, Record<string, Permission[]>>,
  );

  return Object.entries(grouped).map(([appId, domains]) => ({
    appId,
    appName: APP_NAME_MAP[appId] || appId,
    domains: Object.entries(domains).map(([domain, perms]) => ({
      domain,
      permissions: perms,
    })),
  }));
}

export const permissionQueryKeys = createQueryKeys('permissions', {
  getPermissions: (params?: PermissionSearchParams) => [params],
  getGroupedPermissions: null,
});

/**
 * 권한 목록 조회 훅
 */
export const useGetPermissions = ({ params, queryOptions }: QueryHookWithParamsOptions<Permission[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getPermissions(params as PermissionSearchParams).queryKey,
    queryFn: () => permissionApi.getPermissions(params as PermissionSearchParams),
    ...queryOptions,
  });
};

/**
 * 그룹화된 권한 목록 조회 훅
 * - /permission-list API로 조회 후 프론트에서 그룹화
 */
export const useGetGroupedPermissions = ({ queryOptions }: QueryHookOptions<PermissionGroup[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getGroupedPermissions.queryKey,
    queryFn: async () => {
      const permissions = await permissionApi.getPermissions();
      return groupPermissionsByApp(permissions);
    },
    ...queryOptions,
  });
};
