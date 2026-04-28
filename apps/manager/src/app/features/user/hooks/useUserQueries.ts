import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userApi } from '../api/userApi';
import type { User, UserCreateDatas } from '../types/user.types';

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
  getUsers: (params?: Record<string, unknown>) => [params],
  searchUsers: (params?: Record<string, unknown>) => [params],
  getUser: (params?: Record<string, unknown>) => [params],
  getUserByUsername: (params?: Record<string, unknown>) => [params],
});

/**
 * 사용자 목록 조회 훅 (전체 조회, 페이징 없음)
 */
export const useGetUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<User[]> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUsers(params).queryKey,
    queryFn: () => userApi.getUsers(params),
    ...queryOptions,
  });
};

/**
 * 사용자 검색 훅
 */
export const useSearchUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<User>> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.searchUsers(params).queryKey,
    queryFn: () => userApi.searchUsers(params),
    ...queryOptions,
  });
};

/**
 * 사용자 단건 조회 훅
 */
export const useGetUser = ({ params, queryOptions }: QueryHookWithParamsOptions<User> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUser(params).queryKey,
    queryFn: () => userApi.getUser(params),
    ...queryOptions,
  });
};

/**
 * 사용자명으로 사용자 조회 훅
 */
export const useGetUserByUsername = ({ params, queryOptions }: QueryHookWithParamsOptions<User> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUserByUsername(params).queryKey,
    queryFn: () => userApi.getUserBySabun(params),
    ...queryOptions,
  });
};

/**
 * 사용자 생성 훅
 */
export const useCreateUser = ({ mutationOptions }: MutationHookOptions<User, UserCreateDatas> = {}) => {
  return useMutation({
    mutationFn: userApi.createUser,
    ...mutationOptions,
  });
};

/**
 * 사용자 수정 훅
 */
export const useUpdateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.updateUser,
    ...mutationOptions,
  });
};

/**
 * 사용자 삭제 훅
 */
export const useDeleteUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.deleteUser,
    ...mutationOptions,
  });
};

/**
 * 비밀번호 변경 훅
 */
export const useChangePassword = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.changePassword,
    ...mutationOptions,
  });
};

/**
 * 로그인 잠금 해제 훅
 */
export const useUnlockUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.unlockUser,
    ...mutationOptions,
  });
};

/**
 * 로그인 잠금 훅
 */
export const useLockUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.lockUser,
    ...mutationOptions,
  });
};

/**
 * 비밀번호 초기화 훅 (계정명으로 초기화)
 */
export const useResetPasswordToAccount = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.resetPasswordToAccount,
    ...mutationOptions,
  });
};
