/**
 * IPT 조직도관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: BT-ADMIN-SERVICE-MIGRATION V141):
 *  IPT 조직 (/api/ipron/ipt-orgs)
 *    ipron-ipt-org-tree          GET    트리 (조직도·사용자관리 공용)
 *    ipron-ipt-org-tenants       GET    테넌트별 통계 (운영자 대행 선택기 — V142)
 *    ipron-ipt-org-list          GET    직계 하위 목록
 *    ipron-ipt-org-detail        GET    단건 (+조직경로)
 *    ipron-ipt-org-create        POST   등록
 *    ipron-ipt-org-update        PUT    수정
 *    ipron-ipt-org-delete        DELETE 삭제 (사용자/하위 있으면 409)
 *    ipron-ipt-org-sort-update   PUT    정렬순서 일괄 변경 (+hierarchy 재빌드)
 *  멘트 콤보: ipron-acd-gdn-ment-options (기존 공용 flow 재사용, ?tenantId)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { IptOrgCreateRequest, IptOrgResponse, IptOrgSortSeqUpdateRequest, IptOrgTenantStat, IptOrgTreeNode, IptOrgUpdateRequest, MentOption } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const iptOrgApi = {
  // BE 가 ApiResponse<List<X>> 반환 → BFF 가 data.value 로 wrap (agent-master 동일 패턴)
  getTree: async (params?: { tenantId?: number }): Promise<IptOrgTreeNode[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IptOrgTreeNode[] }>>('/ipron-ipt-org-tree', { params });
    return res.data?.data?.value ?? [];
  },

  /** 테넌트별 조직 통계 — 운영자 대행 선택기 (agent-master getTenants 패턴) */
  getTenants: async (): Promise<IptOrgTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IptOrgTenantStat[] }>>('/ipron-ipt-org-tenants');
    return res.data?.data?.value ?? [];
  },

  getList: async (params: { tenantId: number; priorGrpId?: number; dnGrpName?: string }): Promise<IptOrgResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IptOrgResponse[] }>>('/ipron-ipt-org-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (dnGroupId: number): Promise<IptOrgResponse> => {
    const res = await apiClient.get<ApiResponse<IptOrgResponse>>('/ipron-ipt-org-detail', { params: { dnGroupId } });
    return res.data?.data;
  },

  create: async (body: IptOrgCreateRequest): Promise<IptOrgResponse> => {
    // 운영자 전체(view-all) 모드 등록: body.tenantId 를 X-Act-As-Tenant 로 승격 (ipron 공통 패턴)
    const res = await apiClient.post<ApiResponse<IptOrgResponse>>('/ipron-ipt-org-create', body, { actAsTenantFromBody: true });
    return res.data?.data;
  },

  update: async (dnGroupId: number, body: IptOrgUpdateRequest): Promise<IptOrgResponse> => {
    const res = await apiClient.put<ApiResponse<IptOrgResponse>>('/ipron-ipt-org-update', body, { params: { dnGroupId } });
    return res.data?.data;
  },

  delete: async (dnGroupId: number): Promise<void> => {
    await apiClient.delete('/ipron-ipt-org-delete', { params: { dnGroupId } });
  },

  updateSortSeq: async (body: IptOrgSortSeqUpdateRequest): Promise<void> => {
    await apiClient.put('/ipron-ipt-org-sort-update', body);
  },

  /** 멘트 콤보 (링백/보류/국선 공용) — 기존 acd-gdn 공용 flow 재사용 */
  getMentOptions: async (params?: { tenantId?: number }): Promise<MentOption[]> => {
    const res = await apiClient.get<ApiResponse<{ value: MentOption[] }>>('/ipron-acd-gdn-ment-options', { params });
    return res.data?.data?.value ?? [];
  },
};
