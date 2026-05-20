import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions } from '@/shared-util';
import { dnStatusApi } from '../api/dnStatusApi';
import type { DnStatusItem } from '../types';

export const dnStatusQueryKeys = createQueryKeys('stt-dn-monitoring', {
  getDnStatusList: null,
});

export const useGetDnStatusList = ({ queryOptions }: QueryHookOptions<DnStatusItem[]> = {}) => {
  return useQuery({
    queryKey: dnStatusQueryKeys.getDnStatusList.queryKey,
    queryFn: () => dnStatusApi.getDnStatusList(),
    refetchInterval: 3000,
    ...queryOptions,
  });
};
