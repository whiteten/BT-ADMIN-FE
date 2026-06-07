/**
 * 단말기 이력 조회 API 클라이언트 (IPR20S2130)
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - device-history-list:  GET 단말기 이력 목록 (서버 페이징)
 * - device-history-excel: GET 단말기 이력 Excel 다운로드
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DevHistoryResponse, DevHistorySearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface DevHistoryListResult {
  items: DevHistoryResponse[];
  total: number;
  page: number;
  size: number;
}

export const deviceHistoryApi = {
  /**
   * 단말기 이력 목록 조회 (서버 페이징)
   * @flow device-history-list
   */
  async list(params?: DevHistorySearchParams): Promise<DevHistoryListResult> {
    const response = await apiClient.get<ApiResponse<DevHistoryListResult>>('/device-history-list', {
      params,
    });
    return response.data?.data ?? { items: [], total: 0, page: 0, size: 20 };
  },

  /**
   * 단말기 이력 Excel 다운로드
   * @flow device-history-excel
   */
  async exportExcel(params?: Omit<DevHistorySearchParams, 'page' | 'size'>): Promise<Blob> {
    const response = await apiClient.get<Blob>('/device-history-excel', {
      params,
      responseType: 'blob',
    });
    return (response as unknown as { data: Blob }).data;
  },
};
