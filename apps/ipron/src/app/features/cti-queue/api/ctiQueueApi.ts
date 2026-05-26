/**
 * CTI 큐 관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\ipron-cti-queue\seed.sql):
 *  ipron-cti-queue-list     GET  목록
 *  ipron-cti-queue-detail   GET  상세 (?ctiqId)
 *  ipron-cti-queue-create   POST 등록
 *  ipron-cti-queue-update   PUT  수정 (?ctiqId)
 *  ipron-cti-queue-delete   DELETE 삭제 (?ctiqId)
 *  ipron-cti-queue-tenants  GET  테넌트 통계
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { CtiQueueCreateRequest, CtiQueueResponse, CtiQueueTenantStat, CtiQueueUpdateRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const ctiQueueApi = {
  // ─── List / Detail ────────────────────────────────────────────────────────

  getList: async (): Promise<CtiQueueResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueResponse[] }>>('/ipron-cti-queue-list');
    return res.data?.data?.value ?? [];
  },

  getDetail: async (ctiqId: number): Promise<CtiQueueResponse> => {
    const res = await apiClient.get<ApiResponse<CtiQueueResponse>>('/ipron-cti-queue-detail', {
      params: { ctiqId },
    });
    return res.data?.data;
  },

  getTenants: async (): Promise<CtiQueueTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueTenantStat[] }>>('/ipron-cti-queue-tenants');
    return res.data?.data?.value ?? [];
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  create: async (body: CtiQueueCreateRequest): Promise<CtiQueueResponse> => {
    const res = await apiClient.post<ApiResponse<CtiQueueResponse>>('/ipron-cti-queue-create', body);
    return res.data?.data;
  },

  update: async (ctiqId: number, body: CtiQueueUpdateRequest): Promise<CtiQueueResponse> => {
    const res = await apiClient.put<ApiResponse<CtiQueueResponse>>('/ipron-cti-queue-update', body, {
      params: { ctiqId },
    });
    return res.data?.data;
  },

  delete: async (ctiqId: number): Promise<void> => {
    await apiClient.delete('/ipron-cti-queue-delete', { params: { ctiqId } });
  },
};
