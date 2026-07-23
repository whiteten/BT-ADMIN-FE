import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { monConfigApi } from '../api/monConfigApi';
import type { MonConfigItem, MonConfigSaveItem } from '../types';

export const monitoringConfigKeys = createAppQueryKeys('monitoring-config', {
  list: (category?: string) => [category ?? 'ALL'],
});

/** 카테고리 설정 조회. */
export const useGetMonConfigs = ({
  params,
  queryOptions,
}: { params?: { category?: string }; queryOptions?: Omit<UseQueryOptions<MonConfigItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({
    ...monitoringConfigKeys.list(params?.category),
    queryFn: () => monConfigApi.getConfigs(params?.category),
    ...queryOptions,
  });

/** 카테고리 단위 일괄 저장(교체). 성공 시 해당 카테고리 캐시 무효화. */
export const useReplaceMonConfig = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<MonConfigItem[], Error, { category: string; items: MonConfigSaveItem[] }> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, items }) => monConfigApi.replaceCategory(category, items),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: monitoringConfigKeys.list._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
