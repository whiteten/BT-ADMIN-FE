/**
 * ACD 그룹DN API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\\bt-admin-ipron-work\\ipron-acd-gdn\\seed.sql):
 *  - ipron-acd-gdn-list              GET  목록 (?tenantId&keyword)
 *  - ipron-acd-gdn-detail            GET  상세 ({id})
 *  - ipron-acd-gdn-create            POST 등록
 *  - ipron-acd-gdn-update            PUT  수정 ({id})
 *  - ipron-acd-gdn-delete-batch      POST 다건 삭제 (body: gdnIds[])
 *  - ipron-acd-gdn-dn-dup-check      GET  중복 검증 (?nodeId&gdnNo[&excludeGdnId])
 *  - ipron-acd-gdn-tenants           GET  테넌트 통계
 *  - ipron-acd-gdn-members-list      GET  멤버 목록 ({id}/members)
 *  - ipron-acd-gdn-members-save      POST 멤버 일괄 저장
 *  - ipron-acd-gdn-member-candidates GET  멤버 후보
 *  - ipron-acd-gdn-ment-options      GET  멘트 콤보 옵션 (8개 공용, ?tenantId)
 *  - ipron-acd-gdn-skillset-options  GET  스킬셋 콤보 옵션 (ACD_TYPE=3 활성, ?tenantId)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { GdnCreateRequest, GdnDeleteRequest, GdnMemberResponse, GdnMemberSaveRequest, GdnOptionItem, GdnResponse, GdnTenantStat, GdnUpdateRequest } from '../types';

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

  /**
   * 동일 NODE_ID 내 GDN + DN 패밀리 + SIP 트렁크 cross-check (IMPL-BE §①).
   * 시그니처 변경: tenantId → nodeId (2026-05-27).
   */
  duplicateCheck: async (params: { nodeId: number; gdnNo: string; excludeGdnId?: number }): Promise<boolean> => {
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

  // ─── 콤보 옵션 (IMPL-BE §③) ─────────────────────────────────────
  /** 멘트 8개 공용 콤보 (INIT/WAIT/CLOSE/CONN/HOLD/CO_CONN/CO_HOLD/BLOCK) — TB_IE_ANNOUNCEBGM, nodeId+tenantId 필터 (각각 0=글로벌 포함) */
  getMentOptions: async (params?: { tenantId?: number; nodeId?: number }): Promise<GdnOptionItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: GdnOptionItem[] }>>('/ipron-acd-gdn-ment-options', { params });
    return res.data?.data?.value ?? [];
  },

  /** 스킬셋 콤보 — ACD_TYPE=3 활성 시 사용 */
  getSkillsetOptions: async (params?: { tenantId?: number }): Promise<GdnOptionItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: GdnOptionItem[] }>>('/ipron-acd-gdn-skillset-options', { params });
    return res.data?.data?.value ?? [];
  },
};
