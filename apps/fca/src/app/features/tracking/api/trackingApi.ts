import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { TrackingCommandRequest, TrackingCommandResult, TrackingSessionDetail } from '../types/tracking.types';

const apiClient = new ApiClient({ serviceURL: '/bff/sse' });

export const trackingApi = {
  getSessionDetail: async (ucid: string, nexthop: number): Promise<TrackingSessionDetail> => {
    const response = await apiClient.get<DetailResponse<TrackingSessionDetail>>(`/fca/tracking/bot-realtime/${ucid}`, { params: { nexthop } });
    return extractDetail(response);
  },

  sendCommand: async (data: TrackingCommandRequest): Promise<TrackingCommandResult> => {
    const response = await apiClient.post<DetailResponse<TrackingCommandResult>>('/fca/tracking/bot-realtime/command', data);
    return extractDetail(response);
  },
};
