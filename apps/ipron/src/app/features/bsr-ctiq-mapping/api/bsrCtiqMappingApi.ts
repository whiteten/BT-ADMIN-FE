/**
 * BSR 그룹별 CTI큐 배정 API 클라이언트.
 *
 * BFF flow (seed: C:\bt-admin-ipron-work\ipron-bsr-ctiq-mapping\seed.sql):
 *   ipron-bsr-ctiq-list      GET  BSR 그룹 CTI큐 목록
 *   ipron-bsr-ctiq-update    PUT  인라인 편집 일괄저장
 *   ipron-bsr-ctiq-search    GET  CTI큐 배정 팝업 검색
 *   ipron-bsr-ctiq-assign    PUT  CTI큐 BSR 그룹 변경
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { BsrCtiqAssignRequest, BsrCtiqMappingResponse, BsrCtiqMappingUpdateRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const bsrCtiqMappingApi = {
  getList: async (bsrGroupId: number, tenantId: number): Promise<BsrCtiqMappingResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrCtiqMappingResponse[] }>>('/ipron-bsr-ctiq-list', { params: { bsrGroupId, tenantId } });
    return res.data?.data?.value ?? [];
  },

  updateMappings: async (bsrGroupId: number, body: BsrCtiqMappingUpdateRequest): Promise<void> => {
    await apiClient.put('/ipron-bsr-ctiq-update', body, { params: { bsrGroupId } });
  },

  searchCtiq: async (params: { bsrGroupId?: number; gdnNoStart?: string; gdnNoEnd?: string }): Promise<BsrCtiqMappingResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrCtiqMappingResponse[] }>>('/ipron-bsr-ctiq-search', { params });
    return res.data?.data?.value ?? [];
  },

  assignCtiq: async (body: BsrCtiqAssignRequest): Promise<void> => {
    await apiClient.put('/ipron-bsr-ctiq-assign', body);
  },
};
