import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { sttMonitoringApi } from '../api/sttMonitoringApi';
import type { SttChatSentence } from '../types';

export const sttMonitoringQueryKeys = createQueryKeys('stt-chat', {
  getChatContent: (params?: Record<string, unknown>) => [params],
});

export const useGetSttChatContent = ({ params, queryOptions }: QueryHookWithParamsOptions<SttChatSentence[]> = {}) => {
  return useQuery({
    queryKey: sttMonitoringQueryKeys.getChatContent(params).queryKey,
    queryFn: () => sttMonitoringApi.getChatContent(params as { ucidGkey: string }),
    enabled: !!(params as { ucidGkey?: string })?.ucidGkey,
    refetchInterval: 500,
    ...queryOptions,
  });
};
