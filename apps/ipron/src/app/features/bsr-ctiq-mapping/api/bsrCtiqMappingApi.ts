/**
 * BSR 그룹별 CTI큐 배정 API 클라이언트.
 *
 * BFF flow (seed: C:\bt-admin-ipron-work\ipron-bsr-ctiq-mapping\seed.sql):
 *   ipron-bsr-ctiq-list      GET  BSR 그룹 CTI큐 목록
 *   ipron-bsr-ctiq-update    PUT  인라인 편집 일괄저장
 *   ipron-bsr-ctiq-search    GET  CTI큐 배정 팝업 검색 (v2: tenantId/keyword/treeIds/scope/limit)
 *   ipron-bsr-ctiq-assign    PUT  CTI큐 BSR 그룹 변경
 *   ipron-bsr-ctiq-unassign  PUT  CTI큐 BSR 그룹 해제 (v2 신설)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { BsrCtiqAssignRequest, BsrCtiqMappingResponse, BsrCtiqMappingUpdateRequest, BsrCtiqSearchParams, BsrCtiqSearchResult, BsrCtiqUnassignRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const bsrCtiqMappingApi = {
  getList: async (bsrGroupId: number, tenantId: number): Promise<BsrCtiqMappingResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrCtiqMappingResponse[] }>>('/ipron-bsr-ctiq-list', { params: { bsrGroupId, tenantId } });
    return res.data?.data?.value ?? [];
  },

  updateMappings: async (bsrGroupId: number, body: BsrCtiqMappingUpdateRequest): Promise<void> => {
    await apiClient.put('/ipron-bsr-ctiq-update', body, { params: { bsrGroupId } });
  },

  /**
   * CTI큐 배정 팝업 검색 (v2 확장 — PLAN §2-2).
   * tenantId 필수(멀티테넌트 보안), scope 기본=unassigned, limit 기본=50.
   * 응답: { total, items } — total > items.length 시 FE 에서 안내 표시.
   */
  searchCtiq: async (params: BsrCtiqSearchParams): Promise<BsrCtiqSearchResult> => {
    const res = await apiClient.get<ApiResponse<BsrCtiqSearchResult>>('/ipron-bsr-ctiq-search', {
      params: {
        tenantId: params.tenantId,
        keyword: params.keyword || undefined,
        treeIds: params.treeIds?.length ? params.treeIds.join(',') : undefined,
        scope: params.scope ?? 'unassigned',
        limit: params.limit ?? 50,
      },
    });
    return res.data?.data ?? { total: 0, items: [] };
  },

  assignCtiq: async (body: BsrCtiqAssignRequest): Promise<void> => {
    await apiClient.put('/ipron-bsr-ctiq-assign', body);
  },

  /**
   * CTI큐 BSR 그룹 배정 해제 (v2 신설 — PLAN §2-2).
   * PUT /api/ipron/bsr-groups/{bsrGroupId}/ctiq-unassign
   */
  unassignCtiq: async (bsrGroupId: number, body: BsrCtiqUnassignRequest): Promise<void> => {
    await apiClient.put('/ipron-bsr-ctiq-unassign', body, { params: { bsrGroupId } });
  },
};
