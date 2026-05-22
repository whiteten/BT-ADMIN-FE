/**
 * 상담사 관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\ipron-agent-master\seed.sql):
 *  상담사 (/api/ipron/agents)
 *    ipron-agent-master-list             GET    목록
 *    ipron-agent-master-detail           GET    상세
 *    ipron-agent-master-create           POST   등록
 *    ipron-agent-master-update           PUT    수정
 *    ipron-agent-master-delete-batch     POST   일괄 삭제 (body: agentIds[])
 *    ipron-agent-master-move             POST   그룹 이동 (드래그앤드롭)
 *    ipron-agent-master-duplicate-check  GET    로그인 ID 중복 체크
 *    ipron-agent-master-tenants          GET    테넌트 통계
 *  상담그룹 (/api/ipron/agent-groups)
 *    ipron-agent-group-tree              GET    트리
 *    ipron-agent-group-detail            GET    상세
 *    ipron-agent-group-create            POST   등록
 *    ipron-agent-group-update            PUT    수정
 *    ipron-agent-group-delete            DELETE 삭제
 *    ipron-agent-group-children-count    GET    자식+상담사 카운트 (삭제 전 체크)
 */
import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type {
  AgentCreateRequest,
  AgentDuplicateCheckParams,
  AgentGroupCreateRequest,
  AgentGroupNode,
  AgentGroupReorderRequest,
  AgentGroupResponse,
  AgentGroupUpdateRequest,
  AgentMoveRequest,
  AgentResponse,
  AgentTenantStat,
  AgentUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentMasterApi = {
  // ─── 상담사 조회 ─────────────────────────────────────────────────────────

  // BE 가 ApiResponse<List<X>> 반환 → BFF 가 data.value 로 wrap (PagedResponse 아닌 raw List 패턴)
  getList: async (params?: { tenantId?: number; groupId?: number; keyword?: string }): Promise<AgentResponse[]> => {
    const res = await apiClient.get<DetailResponse<{ value: AgentResponse[] }>>('/ipron-agent-master-list', { params });
    return extractDetail(res)?.value ?? [];
  },

  getDetail: async (id: number): Promise<AgentResponse> => {
    const res = await apiClient.get<DetailResponse<AgentResponse>>('/ipron-agent-master-detail', { params: { id } });
    return extractDetail(res);
  },

  // BFF wrap pattern — DN node-tenants / ADN tenants 와 동일
  getTenants: async (): Promise<AgentTenantStat[]> => {
    const res = await apiClient.get<DetailResponse<{ value: AgentTenantStat[] }>>('/ipron-agent-master-tenants');
    return extractDetail(res)?.value ?? [];
  },

  duplicateCheck: async (params: AgentDuplicateCheckParams): Promise<boolean> => {
    const res = await apiClient.get<DetailResponse<boolean>>('/ipron-agent-master-duplicate-check', { params });
    return extractDetail(res);
  },

  // ─── 상담사 변경 ─────────────────────────────────────────────────────────

  create: async (body: AgentCreateRequest): Promise<AgentResponse> => {
    const res = await apiClient.post<DetailResponse<AgentResponse>>('/ipron-agent-master-create', body);
    return extractDetail(res);
  },

  update: async (id: number, body: AgentUpdateRequest): Promise<AgentResponse> => {
    const res = await apiClient.put<DetailResponse<AgentResponse>>('/ipron-agent-master-update', body, {
      params: { id },
    });
    return extractDetail(res);
  },

  deleteBatch: async (agentIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-agent-master-delete-batch', { agentIds });
  },

  move: async (id: number, body: AgentMoveRequest): Promise<AgentResponse> => {
    const res = await apiClient.post<DetailResponse<AgentResponse>>('/ipron-agent-master-move', body, {
      params: { id },
    });
    return extractDetail(res);
  },

  // ─── 상담그룹 조회 ───────────────────────────────────────────────────────

  getGroupTree: async (params?: { tenantId?: number }): Promise<AgentGroupNode[]> => {
    const res = await apiClient.get<DetailResponse<{ value: AgentGroupNode[] }>>('/ipron-agent-group-tree', { params });
    return extractDetail(res)?.value ?? [];
  },

  getGroupDetail: async (id: number): Promise<AgentGroupResponse> => {
    const res = await apiClient.get<DetailResponse<AgentGroupResponse>>('/ipron-agent-group-detail', { params: { id } });
    return extractDetail(res);
  },

  getGroupChildrenCount: async (id: number): Promise<number> => {
    const res = await apiClient.get<DetailResponse<number>>('/ipron-agent-group-children-count', { params: { id } });
    return extractDetail(res);
  },

  // ─── 상담그룹 변경 ───────────────────────────────────────────────────────

  createGroup: async (body: AgentGroupCreateRequest): Promise<AgentGroupResponse> => {
    const res = await apiClient.post<DetailResponse<AgentGroupResponse>>('/ipron-agent-group-create', body);
    return extractDetail(res);
  },

  updateGroup: async (id: number, body: AgentGroupUpdateRequest): Promise<AgentGroupResponse> => {
    const res = await apiClient.put<DetailResponse<AgentGroupResponse>>('/ipron-agent-group-update', body, {
      params: { id },
    });
    return extractDetail(res);
  },

  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete('/ipron-agent-group-delete', { params: { id } });
  },

  reorderGroup: async (id: number, body: AgentGroupReorderRequest): Promise<AgentGroupResponse> => {
    const res = await apiClient.post<DetailResponse<AgentGroupResponse>>('/ipron-agent-group-reorder', body, {
      params: { id },
    });
    return extractDetail(res);
  },
};
