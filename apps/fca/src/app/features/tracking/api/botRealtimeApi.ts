import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { TrackingCommandRequest, TrackingCommandResult, TrackingSessionDetail } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const botRealtimeApi = {
  getSessionDetail: async (ucid: string, nexthop: number): Promise<TrackingSessionDetail> => {
    const response = await apiClient.get<DetailResponse<TrackingSessionDetail>>(`/bot-realtime-detail/${ucid}`, { params: { nexthop } });
    return extractDetail(response);
  },

  sendCommand: async (data: TrackingCommandRequest): Promise<TrackingCommandResult> => {
    const response = await apiClient.post<DetailResponse<TrackingCommandResult>>('/bot-realtime-command', data);
    return extractDetail(response);
  },
};
