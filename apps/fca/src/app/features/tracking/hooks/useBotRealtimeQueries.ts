import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { botRealtimeApi } from '../api/botRealtimeApi';
import type { TrackingCommandRequest, TrackingCommandResult, TrackingSessionDetail } from '../types/tracking.types';

export const botRealtimeQueryKeys = createQueryKeys('tracking', {
  getSessionDetail: (ucid: string, nexthop: number) => [ucid, nexthop],
});

export const useGetSessionDetail = (ucid: string, nexthop: number, { queryOptions }: QueryHookOptions<TrackingSessionDetail> = {}) => {
  return useQuery({
    queryKey: botRealtimeQueryKeys.getSessionDetail(ucid, nexthop).queryKey,
    queryFn: () => botRealtimeApi.getSessionDetail(ucid, nexthop),
    enabled: !!ucid,
    ...queryOptions,
  });
};

export const useSendTrackingCommand = ({ mutationOptions }: MutationHookOptions<TrackingCommandResult, TrackingCommandRequest> = {}) => {
  return useMutation({
    mutationFn: botRealtimeApi.sendCommand,
    ...mutationOptions,
  });
};
