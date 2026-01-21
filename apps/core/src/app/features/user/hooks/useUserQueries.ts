import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userApi } from '../api/userApi';
import type { PasswordChangeRequest, User, UserRequest, UserSearchParams } from '../types/user.types';

/**
 * 페이징 응답 타입
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * 사용자 쿼리 키 정의
 */
export const userQueryKeys = createQueryKeys('users', {
  getUsers: () => ['all'],
  searchUsers: (params?: Record<string, unknown>) => [params],
  getUser: (userId?: number) => [userId],
  getUserBySabun: (userSabun?: string) => [userSabun],
});

/**
 * 사용자 목록 조회 훅 (전체 조회, 페이징 없음)
 */
export const useGetUsers = ({ queryOptions }: { queryOptions?: QueryHookWithParamsOptions<User[]>['queryOptions'] } = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUsers().queryKey,
    queryFn: () => userApi.getUsers(),
    ...queryOptions,
  });
};

/**
 * 사용자 검색 훅
 */
export const useSearchUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<User>> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.searchUsers(params).queryKey,
    queryFn: () => userApi.searchUsers(params as UserSearchParams),
    ...queryOptions,
  });
};

/**
 * 사용자 단건 조회 훅
 */
export const useGetUser = ({ userId, queryOptions }: { userId?: number; queryOptions?: QueryHookWithParamsOptions<User>['queryOptions'] } = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUser(userId).queryKey,
    queryFn: () => userApi.getUser(userId!),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 사번으로 사용자 조회 훅
 */
export const useGetUserBySabun = ({ userSabun, queryOptions }: { userSabun?: string; queryOptions?: QueryHookWithParamsOptions<User>['queryOptions'] } = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUserBySabun(userSabun).queryKey,
    queryFn: () => userApi.getUserBySabun(userSabun!),
    enabled: !!userSabun,
    ...queryOptions,
  });
};

/**
 * 사용자 생성 훅
 */
export const useCreateUser = ({ mutationOptions }: MutationHookOptions<User, UserRequest> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};

/**
 * 사용자 수정 훅
 */
export const useUpdateUser = ({ mutationOptions }: MutationHookOptions<User, { userId: number; data: UserRequest }> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};

/**
 * 사용자 삭제 훅
 */
export const useDeleteUser = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};

/**
 * 비밀번호 변경 훅
 */
export const useChangePassword = ({ mutationOptions }: MutationHookOptions<void, { userId: number; data: PasswordChangeRequest }> = {}) => {
  return useMutation({
    mutationFn: userApi.changePassword,
    ...mutationOptions,
  });
};

/**
 * 로그인 잠금 해제 훅
 */
export const useUnlockUser = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.unlockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};

/**
 * 로그인 잠금 훅
 */
export const useLockUser = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.lockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};
