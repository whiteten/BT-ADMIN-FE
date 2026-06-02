import ApiClient, { type ApiResponse } from '@/shared-util';
import type { AoeDashboardResponse } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * AOE 모니터링 API.
 * <p>실시간 갱신은 WebSocket(useAoeMonitoringSocket)을 사용하고,
 * 본 HTTP API 는 초기 로드/폴백용이다.</p>
 */
export const monitoringApi = {
  /** 대시보드 통합 조회 (BFF flow: aoe-monitoring-dashboard) */
  getDashboard: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<AoeDashboardResponse>>('/aoe-monitoring-dashboard', { params });
    return response.data?.data;
  },
};
