import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { trackingApi } from '../api/trackingApi';
import type { TrackingCommandRequest, TrackingCommandResult, TrackingSessionDetail } from '../types/tracking.types';

export const trackingQueryKeys = createQueryKeys('tracking', {
  getSessionDetail: (ucid: string, nexthop: number) => [ucid, nexthop],
});

export const useGetSessionDetail = (ucid: string, nexthop: number, { queryOptions }: QueryHookOptions<TrackingSessionDetail> = {}) => {
  return useQuery({
    queryKey: trackingQueryKeys.getSessionDetail(ucid, nexthop).queryKey,
    queryFn: () => trackingApi.getSessionDetail(ucid, nexthop),
    enabled: !!ucid,
    ...queryOptions,
  });
};

export const useSendTrackingCommand = ({ mutationOptions }: MutationHookOptions<TrackingCommandResult, TrackingCommandRequest> = {}) => {
  return useMutation({
    mutationFn: trackingApi.sendCommand,
    ...mutationOptions,
  });
};
