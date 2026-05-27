import ApiClient, { type ApiResponse } from '@/shared-util';
import type { TrackingCommandRequest, TrackingCommandResult, TrackingSessionDetail } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const botRealtimeApi = {
  getSessionDetail: async (ucid: string, nexthop: number): Promise<TrackingSessionDetail> => {
    const response = await apiClient.get<ApiResponse<TrackingSessionDetail>>(`/bot-realtime-detail/${ucid}`, { params: { nexthop } });
    return response.data?.data;
  },

  sendCommand: async (data: TrackingCommandRequest): Promise<TrackingCommandResult> => {
    const response = await apiClient.post<ApiResponse<TrackingCommandResult>>('/bot-realtime-command', data);
    return response.data?.data;
  },
};
