/**
 * 역할 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { roleApi } from '../api/roleApi';
import type { Role, RoleUpdateRequest } from '../types/iam.types';

/**
 * 역할 목록 조회 훅
 */
export const useGetRoles = ({ params, queryOptions }: QueryHookWithParamsOptions<Role[]> = {}) => {
  return useQuery({
    queryKey: sharedApi.role.queryKeys.getRoles(params).queryKey,
    queryFn: () => sharedApi.role.getRoles(params),
    ...queryOptions,
  });
};

/**
 * 역할 단건 조회 훅
 */
export const useGetRole = (params: Record<string, unknown>, { queryOptions }: QueryHookOptions<Role> = {}) => {
  return useQuery({
    queryKey: sharedApi.role.queryKeys.getRole(params).queryKey,
    queryFn: () => sharedApi.role.getRole(params),
    ...queryOptions,
  });
};

/**
 * 역할 생성 Mutation 훅
 */
export const useCreateRoleMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: roleApi.createRole,
    ...mutationOptions,
  });
};

/**
 * 역할 수정 Mutation 훅
 */
export const useUpdateRoleMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ({ roleId, request }: { roleId: number; request: RoleUpdateRequest }) => roleApi.updateRole(roleId, request),
    ...mutationOptions,
  });
};

/**
 * 역할 삭제 Mutation 훅
 */
export const useDeleteRoleMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: roleApi.deleteRole,
    ...mutationOptions,
  });
};
