import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { statConfigApi } from '../api/statConfigApi';
import type { StatConfigBulkSaveRequest, StatConfigItem } from '../types';

export const statConfigKeys = createQueryKeys('statistics-stat-config', {
  list: (params?: Record<string, unknown>) => [params],
});

/** 통계 글로벌 정책 조회. */
export const useGetStatConfigs = ({
  params,
  queryOptions,
}: { params?: { category?: string }; queryOptions?: Omit<UseQueryOptions<StatConfigItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...statConfigKeys.list(params), queryFn: () => statConfigApi.getConfigs(params), ...queryOptions });

/** 통계 글로벌 정책 일괄 저장. 성공 시 조회 캐시 무효화. */
export const useSaveStatConfigs = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<StatConfigItem[], Error, StatConfigBulkSaveRequest> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StatConfigBulkSaveRequest) => statConfigApi.saveConfigs(data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: statConfigKeys.list._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
