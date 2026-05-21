import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { channelStatusApi } from '../api/channelStatusApi';
import type { ChannelStatusItem, ChannelStatusSearchParams } from '../types';

export const channelStatusQueryKeys = createQueryKeys('stt-monitoring', {
  getChannelStatusList: (params?: Record<string, unknown>) => [params],
});

export const useGetChannelStatusList = ({ params, queryOptions }: QueryHookWithParamsOptions<ChannelStatusItem[]> = {}) => {
  return useQuery({
    queryKey: channelStatusQueryKeys.getChannelStatusList(params).queryKey,
    queryFn: () => channelStatusApi.getChannelStatusList(params as unknown as ChannelStatusSearchParams),
    enabled: !!(params as unknown as ChannelStatusSearchParams)?.ipv4,
    refetchInterval: 3000,
    ...queryOptions,
  });
};
