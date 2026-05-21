import ApiClient from '@/shared-util';
import type { PagedResponse, WorkHistoryDetail, WorkHistoryListItem, WorkHistoryListParams } from '../types';

/**
 * API 응답 래퍼
 */
interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message?: string;
  data: T;
}

/**
 * 작업이력 API 클라이언트
 * BFF Flow를 통한 API 호출
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const workHistoryApi = {
  /**
   * 작업이력 목록 조회 (기간만 서버에서 필터링)
   * BFF Flow: work-history-list
   */
  getList: async (params: WorkHistoryListParams): Promise<PagedResponse<WorkHistoryListItem>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<WorkHistoryListItem>>>('/work-history-list', { params });
    return response.data.data;
  },

  /**
   * 작업이력 상세 조회
   * BFF Flow: work-history-detail
   */
  getDetail: async (workId: string): Promise<WorkHistoryDetail> => {
    const response = await apiClient.get<ApiResponse<WorkHistoryDetail>>('/work-history-detail', { params: { workId } });
    return response.data.data;
  },
};
