/**
 * 역할 관리 React Query 훅
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { roleApi } from '../api/roleApi';
import type { Role, RoleUpdateRequest } from '../types/iam.types';

export const roleQueryKeys = createQueryKeys('roles', {
  getRoles: (params?: Record<string, unknown>) => [params],
  getRole: (roleId: number) => [roleId],
});

/**
 * 역할 목록 조회 훅
 * 역할 목록은 세션 동안 거의 변경되지 않으므로 캐시를 유지합니다.
 */
export const useGetRoles = ({ params, queryOptions }: QueryHookWithParamsOptions<Role[]> = {}) => {
  return useQuery({
    queryKey: roleQueryKeys.getRoles(params).queryKey,
    queryFn: () => roleApi.getRoles(params),
    staleTime: Infinity, // 역할 목록은 세션 동안 변경되지 않음
    gcTime: Infinity, // gcTime: 0 전역 설정 오버라이드 - 캐시 유지
    ...queryOptions,
  });
};

/**
 * 역할 단건 조회 훅
 */
export const useGetRole = (roleId: number, { queryOptions }: QueryHookOptions<Role> = {}) => {
  return useQuery({
    queryKey: roleQueryKeys.getRole(roleId).queryKey,
    queryFn: () => roleApi.getRole(roleId),
    enabled: !!roleId,
    ...queryOptions,
  });
};

/**
 * 역할 생성 Mutation 훅
 */
export const useCreateRoleMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess: externalOnSuccess, ...restMutationOptions } = mutationOptions ?? {};

  return useMutation({
    mutationFn: roleApi.createRole,
    onSuccess: (...args) => {
      // staleTime: Infinity 설정으로 인해 invalidateQueries만으로는 refetch가 트리거되지 않음
      // refetchQueries를 사용하여 즉시 새로운 데이터를 가져옴
      queryClient.refetchQueries({ queryKey: roleQueryKeys.getRoles._def });
      // 외부에서 전달된 onSuccess 콜백 실행
      externalOnSuccess?.(...args);
    },
    ...restMutationOptions,
  });
};

/**
 * 역할 수정 Mutation 훅
 */
export const useUpdateRoleMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess: externalOnSuccess, ...restMutationOptions } = mutationOptions ?? {};

  return useMutation({
    mutationFn: ({ roleId, request }: { roleId: number; request: RoleUpdateRequest }) => roleApi.updateRole(roleId, request),
    onSuccess: (...args) => {
      // staleTime: Infinity 설정으로 인해 invalidateQueries만으로는 refetch가 트리거되지 않음
      // refetchQueries를 사용하여 즉시 새로운 데이터를 가져옴
      queryClient.refetchQueries({ queryKey: roleQueryKeys.getRoles._def });
      // 외부에서 전달된 onSuccess 콜백 실행
      externalOnSuccess?.(...args);
    },
    ...restMutationOptions,
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
