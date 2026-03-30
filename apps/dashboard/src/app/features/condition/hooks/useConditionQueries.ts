import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { conditionApi, userFilterApi } from '../api/conditionApi';
import type { SearchConditionItem, UserFilterItem } from '../types/condition.types';

export const conditionQueryKeys = createQueryKeys('condition', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getUserFilters: (params?: Record<string, unknown>) => [params],
});

export const useGetConditionList = ({ params, queryOptions }: QueryHookWithParamsOptions<SearchConditionItem[]> = {}) => {
  return useQuery({
    queryKey: conditionQueryKeys.getList(params).queryKey,
    queryFn: () => conditionApi.getList(params),
    ...queryOptions,
  });
};

export const useGetConditionDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<SearchConditionItem> = {}) => {
  return useQuery({
    queryKey: conditionQueryKeys.getDetail(params).queryKey,
    queryFn: () => conditionApi.getDetail(params),
    ...queryOptions,
  });
};

export const useCreateCondition = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: conditionApi.create,
    ...mutationOptions,
  });
};

export const useUpdateCondition = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: conditionApi.update,
    ...mutationOptions,
  });
};

export const useDeleteCondition = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: conditionApi.delete,
    ...mutationOptions,
  });
};

// 사용자 필터
export const useGetUserFilters = ({ params, queryOptions }: QueryHookWithParamsOptions<UserFilterItem[]> = {}) => {
  return useQuery({
    queryKey: conditionQueryKeys.getUserFilters(params).queryKey,
    queryFn: () => userFilterApi.getList(params),
    ...queryOptions,
  });
};

export const useSaveUserFilter = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userFilterApi.save,
    ...mutationOptions,
  });
};
