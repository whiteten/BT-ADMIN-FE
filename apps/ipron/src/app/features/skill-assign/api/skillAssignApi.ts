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
 *    ipron-skill-bulk-update-pl          POST   N×M 배정행 우선순위·스킬레벨 일괄 수정 (body)
 *    ipron-skill-update                  PUT    P/L 수정 (path: agentId/skillsetId, body)
 *    ipron-skill-unassign                DELETE 단건 해제 (path: agentId/skillsetId)
 *
 *  스킬모음 (/api/ipron/skill-groups)
 *    ipron-skill-groups-list             GET    목록
 *    ipron-skill-groups-create           POST   등록
 *    ipron-skill-groups-update           PUT    수정 (path: skillGroupId, body)
 *    ipron-skill-groups-delete           DELETE 삭제 (path: skillGroupId)
 *    ipron-skill-group-members           GET    멤버 목록 (path: skillGroupId) — 적용 드로어 미리보기
 *    ipron-skill-groups-apply            POST   모음→상담사 일괄 적용 (path: skillGroupId, body agentIds[])
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AgentCoverageItem,
  AvailableSkillsetParams,
  AvailableSkillsetResponse,
  BulkGrantRequest,
  BulkGrantResult,
  BulkRevokeRequest,
  BulkRevokeResult,
  BulkUpdatePlRequest,
  SkillAgentBulkAssignRequest,
  SkillAgentBulkAssignResult,
  SkillAgentResponse,
  SkillAgentUpdateRequest,
  SkillAssignTenantStat,
  SkillGroupApplyRequest,
  SkillGroupApplyResult,
  SkillGroupCreateRequest,
  SkillGroupListParams,
  SkillGroupMemberResponse,
  SkillGroupResponse,
  SkillGroupUpdateRequest,
  SkillsetCoverageItem,
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

  /** 선택된 상담사 N명 기준 스킬셋별 보유 인원 (모드 ① 우측 보유율) */
  getSkillsetCoverage: async (agentIds: number[]): Promise<SkillsetCoverageItem[]> => {
    if (!agentIds.length) return [];
    const res = await apiClient.get<ApiResponse<{ value: SkillsetCoverageItem[] }>>('/ipron-skill-assignments-coverage', {
      params: { agentIds: agentIds.join(',') },
    });
    return res.data?.data?.value ?? [];
  },

  /** 선택된 스킬셋 M건 기준 상담사별 보유 수 (모드 ② 우측 보유율) */
  getAgentCoverage: async (skillsetIds: number[]): Promise<AgentCoverageItem[]> => {
    if (!skillsetIds.length) return [];
    const res = await apiClient.get<ApiResponse<{ value: AgentCoverageItem[] }>>('/ipron-skill-assignments-agent-coverage', {
      params: { skillsetIds: skillsetIds.join(',') },
    });
    return res.data?.data?.value ?? [];
  },

  // ─── 상담사↔스킬셋 ────────────────────────────────────────────────────────

  getSkillsetsByAgent: async (agentId: number, signal?: AbortSignal): Promise<SkillAgentResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillAgentResponse[] }>>('/ipron-skill-skillsets-by-agent', { params: { agentId }, signal });
    return res.data?.data?.value ?? [];
  },

  /** 한 스킬셋에 배정된 상담사 목록 (배정 현황 조회 탭 — 스킬셋 기준) */
  getAgentsBySkillset: async (skillsetId: number, signal?: AbortSignal): Promise<SkillAgentResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillAgentResponse[] }>>('/ipron-skill-agents-by-skillset', { params: { skillsetId }, signal });
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

  /** N × M 일괄 부여 (Drawer 매트릭스). 이미 존재하는 매핑은 BE 가 skip. */
  bulkGrant: async (body: BulkGrantRequest): Promise<BulkGrantResult> => {
    const res = await apiClient.post<ApiResponse<BulkGrantResult>>('/ipron-skill-assignments-bulk-grant', body);
    return res.data?.data;
  },

  /** N × M 일괄 해제. 존재하지 않는 매핑은 skip (실제 삭제 수만 반환). */
  bulkRevoke: async (body: BulkRevokeRequest): Promise<BulkRevokeResult> => {
    const res = await apiClient.post<ApiResponse<BulkRevokeResult>>('/ipron-skill-assignments-bulk-revoke', body);
    return res.data?.data;
  },

  /** N × M 배정행 우선순위·스킬레벨 일괄 수정. 미존재 조합은 skip. 반환 = 갱신된 행 수. */
  bulkUpdatePl: async (body: BulkUpdatePlRequest): Promise<number> => {
    const res = await apiClient.post<ApiResponse<number>>('/ipron-skill-bulk-update-pl', body);
    return res.data?.data ?? 0;
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

  /** 모음 멤버 목록 (적용 드로어 P/L 미리보기 + 수정 드로어 prefill) */
  getSkillGroupMembers: async (skillGroupId: number): Promise<SkillGroupMemberResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillGroupMemberResponse[] }>>('/ipron-skill-group-members', { params: { skillGroupId } });
    return res.data?.data?.value ?? [];
  },

  /** 모음 → 상담사 N명 일괄 적용 (병합/upsert — 기존 타 스킬 보존, 동일 스킬셋은 모음 P/L 갱신) */
  applySkillGroup: async (skillGroupId: number, body: SkillGroupApplyRequest): Promise<SkillGroupApplyResult> => {
    const res = await apiClient.post<ApiResponse<SkillGroupApplyResult>>('/ipron-skill-groups-apply', body, { params: { skillGroupId } });
    return res.data?.data;
  },
};
