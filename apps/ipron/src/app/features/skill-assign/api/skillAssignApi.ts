/**
 * 스킬 배정 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\ipron-skill-assign\seed.sql):
 *
 *  공통 (/api/ipron/skill-assignments)
 *    ipron-skill-assignments-tenants     GET    테넌트별 stats (카드 슬라이더)
 *    ipron-skill-available-skillsets     GET    가용 스킬셋 풀
 *
 *  상담사↔스킬셋 (/api/ipron/skill-agents)
 *    ipron-skill-skillsets-by-agent      GET    한 상담사의 스킬셋 (path: agentId)
 *    ipron-skill-bulk-assign             POST   상담사에 스킬셋 일괄 배정 (path: agentId, body)
 *    ipron-skill-update                  PUT    P/L 수정 (path: agentId/skillsetId, body)
 *    ipron-skill-unassign                DELETE 단건 해제 (path: agentId/skillsetId)
 *
 *  스킬모음 (/api/ipron/skill-groups)
 *    ipron-skill-groups-list             GET    목록
 *    ipron-skill-groups-create           POST   등록
 *    ipron-skill-groups-update           PUT    수정 (path: skillGroupId, body)
 *    ipron-skill-groups-delete           DELETE 삭제 (path: skillGroupId)
 *    (멤버 조회는 BE 가 직접 / Phase 1: 모음 detail 시 함께 조회)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AvailableSkillsetParams,
  AvailableSkillsetResponse,
  SkillAgentBulkAssignRequest,
  SkillAgentBulkAssignResult,
  SkillAgentResponse,
  SkillAgentUpdateRequest,
  SkillAssignTenantStat,
  SkillGroupCreateRequest,
  SkillGroupListParams,
  SkillGroupResponse,
  SkillGroupUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const skillAssignApi = {
  // ─── 공통 ───────────────────────────────────────────────────────────────

  getTenantStats: async (): Promise<SkillAssignTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillAssignTenantStat[] }>>('/ipron-skill-assignments-tenants');
    return res.data?.data?.value ?? [];
  },

  getAvailableSkillsets: async (params?: AvailableSkillsetParams): Promise<AvailableSkillsetResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AvailableSkillsetResponse[] }>>('/ipron-skill-available-skillsets', { params });
    return res.data?.data?.value ?? [];
  },

  // ─── 상담사↔스킬셋 ────────────────────────────────────────────────────────

  getSkillsetsByAgent: async (agentId: number): Promise<SkillAgentResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillAgentResponse[] }>>('/ipron-skill-skillsets-by-agent', { params: { agentId } });
    return res.data?.data?.value ?? [];
  },

  bulkAssign: async (agentId: number, body: SkillAgentBulkAssignRequest): Promise<SkillAgentBulkAssignResult> => {
    const res = await apiClient.post<ApiResponse<SkillAgentBulkAssignResult>>('/ipron-skill-bulk-assign', body, { params: { agentId } });
    return res.data?.data;
  },

  updateSkillAgent: async (agentId: number, skillsetId: number, body: SkillAgentUpdateRequest): Promise<SkillAgentResponse> => {
    const res = await apiClient.put<ApiResponse<SkillAgentResponse>>('/ipron-skill-update', body, { params: { agentId, skillsetId } });
    return res.data?.data;
  },

  unassign: async (agentId: number, skillsetId: number): Promise<void> => {
    await apiClient.delete('/ipron-skill-unassign', { params: { agentId, skillsetId } });
  },

  // ─── 스킬모음 ──────────────────────────────────────────────────────────────

  getSkillGroups: async (params?: SkillGroupListParams): Promise<SkillGroupResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillGroupResponse[] }>>('/ipron-skill-groups-list', { params });
    return res.data?.data?.value ?? [];
  },

  createSkillGroup: async (body: SkillGroupCreateRequest): Promise<SkillGroupResponse> => {
    const res = await apiClient.post<ApiResponse<SkillGroupResponse>>('/ipron-skill-groups-create', body);
    return res.data?.data;
  },

  updateSkillGroup: async (skillGroupId: number, body: SkillGroupUpdateRequest): Promise<SkillGroupResponse> => {
    const res = await apiClient.put<ApiResponse<SkillGroupResponse>>('/ipron-skill-groups-update', body, { params: { skillGroupId } });
    return res.data?.data;
  },

  deleteSkillGroup: async (skillGroupId: number): Promise<void> => {
    await apiClient.delete('/ipron-skill-groups-delete', { params: { skillGroupId } });
  },

  // Phase 1: 모음 멤버 조회는 BFF flow 미등록 — 모음 detail 시 클라이언트가 BE 직접 호출하지 않음.
  // 편집 드로어에서 멤버 수정 = 전체 교체 방식. 멤버 표시는 별도 화면 (모음 detail 페이지)에서 처리.
  // 추후 BFF flow 추가 시 여기에 getSkillGroupMembers 추가.
};
