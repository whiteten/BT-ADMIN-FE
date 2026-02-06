import ApiClient from '@/shared-util';
import type { ApiResponse, BatchStatus, Checkpoint, ExceptionRecord, HourlyTrend, PauseRequest, SchedulerStatus } from '../types/sd.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * BFF 단일 step 응답에서 배열 언래핑.
 * BE가 List를 반환하면 BFF buildAggregationResponse가 { value: [...] }로 감싸므로,
 * 실제 배열을 꺼내준다. 이미 배열이면 그대로 반환.
 */
function unwrapArray<T>(data: T[] | { value: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) return data.value;
  return [];
}

export const sdDashboardApi = {
  /** 등록된 Provider 목록 조회 */
  getProviders: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[] | { value: string[] }>>('/sd-dashboard-providers');
    return unwrapArray(response.data.data);
  },

  /** 모든 Provider의 배치 상태 조회 */
  getAllStatus: async (): Promise<Record<string, BatchStatus>> => {
    const response = await apiClient.get<ApiResponse<Record<string, BatchStatus>>>('/sd-dashboard-status');
    return response.data.data;
  },

  /** 특정 Provider의 배치 상태 조회 */
  getStatus: async (providerId: string): Promise<BatchStatus> => {
    const response = await apiClient.get<ApiResponse<BatchStatus>>('/sd-dashboard-provider-status', {
      params: { providerId },
    });
    return response.data.data;
  },

  /** 시간대별 트렌드 조회 */
  getHourlyTrend: async (providerId: string, date?: string): Promise<HourlyTrend[]> => {
    const response = await apiClient.get<ApiResponse<HourlyTrend[] | { value: HourlyTrend[] }>>('/sd-dashboard-hourly-trend', {
      params: { providerId, ...(date ? { date } : {}) },
    });
    return unwrapArray(response.data.data);
  },

  /** 10분 단위 집계 추이 조회 */
  getRecentCounts: async (providerId: string, date?: string): Promise<HourlyTrend[]> => {
    const response = await apiClient.get<ApiResponse<HourlyTrend[] | { value: HourlyTrend[] }>>('/sd-dashboard-recent-counts', {
      params: { providerId, ...(date ? { date } : {}) },
    });
    return unwrapArray(response.data.data);
  },

  /** 체크포인트 이력 조회 */
  getCheckpoints: async (providerId: string, from: string, to: string): Promise<Checkpoint[]> => {
    const response = await apiClient.get<ApiResponse<Checkpoint[] | { value: Checkpoint[] }>>('/sd-dashboard-checkpoints', {
      params: { providerId, from, to },
    });
    return unwrapArray(response.data.data);
  },

  /** 에러 이력 조회 */
  getExceptions: async (providerId: string, from: string, to: string): Promise<ExceptionRecord[]> => {
    const response = await apiClient.get<ApiResponse<ExceptionRecord[] | { value: ExceptionRecord[] }>>('/sd-dashboard-exceptions', {
      params: { providerId, from, to },
    });
    return unwrapArray(response.data.data);
  },
};

export const sdSchedulerApi = {
  /** 모든 Provider의 스케줄러 상태 조회 */
  getAllStatus: async (): Promise<Record<string, SchedulerStatus>> => {
    const response = await apiClient.get<ApiResponse<Record<string, SchedulerStatus>>>('/sd-scheduler-status');
    return response.data.data;
  },

  /** 특정 Provider의 스케줄러 상태 조회 */
  getStatus: async (providerId: string): Promise<SchedulerStatus> => {
    const response = await apiClient.get<ApiResponse<SchedulerStatus>>('/sd-scheduler-provider-status', {
      params: { providerId },
    });
    return response.data.data;
  },

  /** 스케줄러 일시 정지 */
  pause: async (providerId: string, data: PauseRequest): Promise<void> => {
    await apiClient.post('/sd-scheduler-pause', data, {
      params: { providerId },
    });
  },

  /** 스케줄러 재개 */
  resume: async (providerId: string): Promise<void> => {
    await apiClient.post('/sd-scheduler-resume', null, {
      params: { providerId },
    });
  },
};
