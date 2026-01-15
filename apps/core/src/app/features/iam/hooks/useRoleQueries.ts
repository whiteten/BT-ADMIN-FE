/**
 * 역할 관리 React Query 훅
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { roleApi } from '../api/roleApi';
import type { Role, RoleUpdateRequest } from '../types/iam.types';

export const roleQueryKeys = createQueryKeys('roles', {
  getRoles: (params?: Record<string, unknown>) => [params],
});

/**
 * 역할 목록 조회 훅
 */
export const useGetRoles = ({ params, queryOptions }: QueryHookWithParamsOptions<Role[]> = {}) => {
  return useQuery({
    queryKey: roleQueryKeys.getRoles(params).queryKey,
    queryFn: () => roleApi.getRoles(params),
    ...queryOptions,
  });
};

/**
 * 역할 생성 Mutation 훅
 */
export const useCreateRoleMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleQueryKeys.getRoles._def });
    },
    ...mutationOptions,
  });
};

/**
 * 역할 수정 Mutation 훅
 */
export const useUpdateRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, request }: { roleId: number; request: RoleUpdateRequest }) => roleApi.updateRole(roleId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleQueryKeys.getRoles._def });
    },
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
