/**
 * 권한 관리 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions } from '@/shared-util';
import { type PermissionSearchParams, permissionApi } from '../api/permissionApi';
import type { Permission, PermissionGroup } from '../types/iam.types';

export const permissionQueryKeys = createQueryKeys('permissions', {
  getPermissions: (params?: PermissionSearchParams) => [params],
  getGroupedPermissions: null,
});

/**
 * 권한 목록 조회 훅
 */
export const useGetPermissions = (params?: PermissionSearchParams, { queryOptions }: QueryHookOptions<Permission[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getPermissions(params).queryKey,
    queryFn: () => permissionApi.getPermissions(params),
    ...queryOptions,
  });
};

/**
 * 그룹화된 권한 목록 조회 훅
 */
export const useGetGroupedPermissions = ({ queryOptions }: QueryHookOptions<PermissionGroup[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getGroupedPermissions.queryKey,
    queryFn: () => permissionApi.getGroupedPermissions(),
    ...queryOptions,
  });
};
