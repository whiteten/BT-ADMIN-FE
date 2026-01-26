/**
 * 역할 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { roleApi } from '../api/roleApi';
import type { Role } from '../types/iam.types';

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
export const useGetRole = ({ params, queryOptions }: QueryHookWithParamsOptions<Role> = {}) => {
  return useQuery({
    queryKey: sharedApi.role.queryKeys.getRole(params).queryKey,
    queryFn: () => sharedApi.role.getRole(params),
    ...queryOptions,
  });
};

/**
 * 역할 생성 훅
 */
export const useCreateRole = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: roleApi.createRole,
    ...mutationOptions,
  });
};

/**
 * 역할 수정 훅
 */
export const useUpdateRole = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: roleApi.updateRole,
    ...mutationOptions,
  });
};

/**
 * 역할 삭제 훅
 */
export const useDeleteRole = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: roleApi.deleteRole,
    ...mutationOptions,
  });
};
