/**
 * ACD 그룹DN API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\\bt-admin-ipron-work\\ipron-acd-gdn\\seed.sql):
 *  - ipron-acd-gdn-list              GET  목록 (?tenantId&keyword)
 *  - ipron-acd-gdn-detail            GET  상세 ({id})
 *  - ipron-acd-gdn-create            POST 등록
 *  - ipron-acd-gdn-update            PUT  수정 ({id})
 *  - ipron-acd-gdn-delete-batch      POST 다건 삭제 (body: gdnIds[])
 *  - ipron-acd-gdn-dn-dup-check      GET  중복 검증
 *  - ipron-acd-gdn-tenants           GET  테넌트 통계
 *  - ipron-acd-gdn-members-list      GET  멤버 목록 ({id}/members)
 *  - ipron-acd-gdn-members-save      POST 멤버 일괄 저장
 *  - ipron-acd-gdn-member-candidates GET  멤버 후보
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { GdnCreateRequest, GdnDeleteRequest, GdnMemberResponse, GdnMemberSaveRequest, GdnResponse, GdnTenantStat, GdnUpdateRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const acdGdnApi = {
  // ─── 목록 / 상세 / 통계 ───────────────────────────────────────────
  getList: async (params?: { tenantId?: number; keyword?: string }): Promise<GdnResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: GdnResponse[] }>>('/ipron-acd-gdn-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (id: number): Promise<GdnResponse> => {
    const res = await apiClient.get<ApiResponse<GdnResponse>>('/ipron-acd-gdn-detail', { params: { id } });
    return res.data?.data;
  },

  getTenants: async (): Promise<GdnTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: GdnTenantStat[] }>>('/ipron-acd-gdn-tenants');
    return res.data?.data?.value ?? [];
  },

  duplicateCheck: async (params: { tenantId: number; gdnNo: string; excludeGdnId?: number }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<boolean>>('/ipron-acd-gdn-dn-dup-check', { params });
    return res.data?.data;
  },

  // ─── CRUD ─────────────────────────────────────────────────────────
  create: async (body: GdnCreateRequest): Promise<GdnResponse> => {
    const res = await apiClient.post<ApiResponse<GdnResponse>>('/ipron-acd-gdn-create', body);
    return res.data?.data;
  },

  update: async (id: number, body: GdnUpdateRequest): Promise<GdnResponse> => {
    const res = await apiClient.put<ApiResponse<GdnResponse>>('/ipron-acd-gdn-update', body, { params: { id } });
    return res.data?.data;
  },

  deleteBatch: async (gdnIds: number[]): Promise<void> => {
    const body: GdnDeleteRequest = { gdnIds };
    await apiClient.post('/ipron-acd-gdn-delete-batch', body);
  },

  // ─── 멤버 ─────────────────────────────────────────────────────────
  getMembers: async (id: number): Promise<GdnMemberResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: GdnMemberResponse[] }>>('/ipron-acd-gdn-members-list', { params: { id } });
    return res.data?.data?.value ?? [];
  },

  saveMembers: async (id: number, body: GdnMemberSaveRequest): Promise<void> => {
    await apiClient.post('/ipron-acd-gdn-members-save', body, { params: { id } });
  },

  getMemberCandidates: async (id: number): Promise<GdnMemberResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: GdnMemberResponse[] }>>('/ipron-acd-gdn-member-candidates', { params: { id } });
    return res.data?.data?.value ?? [];
  },
};
