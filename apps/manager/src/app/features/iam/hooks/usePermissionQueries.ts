/**
 * 권한 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { permissionApi } from '../api/permissionApi';
import type { Permission, PermissionCreateRequest, PermissionFlat, PermissionGroup } from '../types';

export const permissionQueryKeys = createQueryKeys('permissions', {
  getGroupedPermissions: null,
  getAuthList: null,
});

/**
 * 앱별 그룹화된 권한 목록 조회 훅
 * - 백엔드에서 appId 기준으로 그룹화된 데이터를 반환
 */
export const useGetGroupedPermissions = ({ queryOptions }: QueryHookOptions<PermissionGroup[]> = {}) => {
  return useQuery({
    queryKey: permissionQueryKeys.getGroupedPermissions.queryKey,
    queryFn: permissionApi.getGroupedPermissions,
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
