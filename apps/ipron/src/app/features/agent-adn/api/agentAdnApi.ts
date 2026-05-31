/**
 * 상담사 로그인번호 관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (외부 시드 SQL: `ipron-dn-agent-adn/seed.sql`):
 *  - ipron-dn-agent-adn-list             GET    매핑 목록
 *  - ipron-dn-agent-adn-tenants          GET    테넌트별 stats
 *  - ipron-dn-agent-adn-policy-get       GET    자동채번 정책
 *  - ipron-dn-agent-adn-policy-save      PUT    자동채번 정책 저장
 *  - ipron-dn-agent-adn-conflict-check   GET    충돌 검사
 *  - ipron-dn-agent-adn-auto-assign      POST   자동할당 실행
 *  - ipron-dn-agent-adn-unassign         POST   매핑 해제 (다건)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AdnAutoConfigResponse,
  AdnAutoConfigUpsertRequest,
  AgentAdnRowResponse,
  AgentAdnTenantStat,
  AutoAssignRequest,
  AutoAssignResponse,
  ConflictCheckResponse,
  UnassignRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentAdnApi = {
  // ─── List / Tenants ─────────────────────────────────────────────────────────

  getList: async (params?: { tenantId?: number; groupId?: number; keyword?: string; status?: string }): Promise<AgentAdnRowResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AgentAdnRowResponse[] }>>('/ipron-dn-agent-adn-list', { params });
    return res.data?.data?.value ?? [];
  },

  getTenants: async (): Promise<AgentAdnTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AgentAdnTenantStat[] }>>('/ipron-dn-agent-adn-tenants');
    return res.data?.data?.value ?? [];
  },

  // ─── Policy ─────────────────────────────────────────────────────────────────

  getPolicy: async (): Promise<AdnAutoConfigResponse> => {
    const res = await apiClient.get<ApiResponse<AdnAutoConfigResponse>>('/ipron-dn-agent-adn-policy-get');
    return res.data?.data;
  },

  savePolicy: async (body: AdnAutoConfigUpsertRequest): Promise<AdnAutoConfigResponse> => {
    const res = await apiClient.put<ApiResponse<AdnAutoConfigResponse>>('/ipron-dn-agent-adn-policy-save', body);
    return res.data?.data;
  },

  conflictCheck: async (params: { prefix: string; digitLength: number }): Promise<ConflictCheckResponse> => {
    const res = await apiClient.get<ApiResponse<ConflictCheckResponse>>('/ipron-dn-agent-adn-conflict-check', { params });
    return res.data?.data;
  },

  // ─── Mutations ──────────────────────────────────────────────────────────────

  autoAssign: async (body: AutoAssignRequest): Promise<AutoAssignResponse> => {
    const res = await apiClient.post<ApiResponse<AutoAssignResponse>>('/ipron-dn-agent-adn-auto-assign', body);
    return res.data?.data;
  },

  unassign: async (body: UnassignRequest): Promise<number> => {
    // BFF 가 primitive(Integer) 응답을 `{ value: N }` 로 wrap (ADN list/tenants 패턴 동일)
    const res = await apiClient.post<ApiResponse<{ value: number } | number>>('/ipron-dn-agent-adn-unassign', body);
    const d = res.data?.data as { value?: number } | number | undefined;
    if (typeof d === 'number') return d;
    return d?.value ?? 0;
  },
};
