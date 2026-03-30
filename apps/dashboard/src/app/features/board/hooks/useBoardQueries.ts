import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { boardApi, userLayoutApi } from '../api/boardApi';
import type { DashboardItem, UserLayoutItem } from '../types/board.types';

export const boardQueryKeys = createQueryKeys('board', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getUserLayout: (params?: Record<string, unknown>) => [params],
});

export const useGetBoardList = ({ params, queryOptions }: QueryHookWithParamsOptions<DashboardItem[]> = {}) => {
  return useQuery({
    queryKey: boardQueryKeys.getList(params).queryKey,
    queryFn: () => boardApi.getList(),
    ...queryOptions,
  });
};

export const useGetBoardDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DashboardItem> = {}) => {
  return useQuery({
    queryKey: boardQueryKeys.getDetail(params).queryKey,
    queryFn: () => boardApi.getDetail(params),
    ...queryOptions,
  });
};

export const useCreateBoard = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: boardApi.create,
    ...mutationOptions,
  });
};

export const useUpdateBoard = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: boardApi.update,
    ...mutationOptions,
  });
};

export const useUpdateBoardLayout = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: boardApi.updateLayout,
    ...mutationOptions,
  });
};

export const useDeleteBoard = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: boardApi.delete,
    ...mutationOptions,
  });
};

// 사용자 레이아웃
export const useGetUserLayout = ({ params, queryOptions }: QueryHookWithParamsOptions<UserLayoutItem[]> = {}) => {
  return useQuery({
    queryKey: boardQueryKeys.getUserLayout(params).queryKey,
    queryFn: () => userLayoutApi.getList(params),
    ...queryOptions,
  });
};

export const useSaveUserLayout = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userLayoutApi.save,
    ...mutationOptions,
  });
};

export const useResetUserLayout = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userLayoutApi.reset,
    ...mutationOptions,
  });
};
