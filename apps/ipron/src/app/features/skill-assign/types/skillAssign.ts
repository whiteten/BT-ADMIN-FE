/**
 * 스킬 배정 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON/.../skillassign/
 *  - 상담사↔스킬셋: TB_IC_SKILLAGENT (SKILLSET_ID, AGENT_ID) PK + PRIORITY + SKILL_LEVEL
 *  - 스킬모음:       TB_IC_SKILL_GROUP_MASTER + TB_IC_SKILL_GROUP_MEMBER
 */

// ──────────────────────────────────────────────────────────
//  공통
// ──────────────────────────────────────────────────────────

export interface SkillAssignTenantStat {
  tenantId: number;
  tenantName: string | null;
  agentCount: number;
  skillsetCount: number;
  mappingCount: number;
  skillGroupCount: number;
  unassignedAgentCnt: number;
}

export interface AvailableSkillsetResponse {
  skillsetId: number;
  skillsetName: string;
  skillsetDesc: string | null;
  tenantId: number;
  tenantName: string | null;
  mediaType: number | null;
  activateYn: number | null;
  sortSeq: number | null;
  agentCount: number;
}

/** 선택된 상담사 N명 기준 스킬셋별 보유 인원 — 모드 ① 우측 보유율 시각화 */
export interface SkillsetCoverageItem {
  skillsetId: number;
  holdingCount: number;
}

/** 선택된 스킬셋 M건 기준 상담사별 보유 수 — 모드 ② 우측 보유율 시각화 */
export interface AgentCoverageItem {
  agentId: number;
  holdingCount: number;
}

/** N × M 일괄 부여 (Drawer 매트릭스) */
export interface BulkGrantMappingItem {
  agentId: number;
  skillsetId: number;
  priority: number;
  skillLevel: number;
}

export interface BulkGrantRequest {
  mappings: BulkGrantMappingItem[];
}

export interface BulkGrantResult {
  added: number;
  skipped: number;
}

export interface BulkRevokeRequest {
  agentIds: number[];
  skillsetIds: number[];
}

export interface BulkRevokeResult {
  removed: number;
}

// ──────────────────────────────────────────────────────────
//  상담사↔스킬셋 (SkillAgent)
// ──────────────────────────────────────────────────────────

export interface SkillAgentResponse {
  agentId: number;
  agentLoginId: string | null;
  agentName: string | null;
  agentAlias: string | null;
  tenantId: number;
  tenantName: string | null;
  groupId: number | null;
  groupName: string | null;
  treeId: number | null;
  treeName: string | null;
  skillsetId: number;
  skillsetName: string;
  skillsetDesc: string | null;
  mediaType: number | null;
  activateYn: number | null;
  priority: number | null;
  skillLevel: number | null;
  workUser?: number | null;
  workTime?: string | null;
}

export interface SkillAgentUpdateRequest {
  priority: number; // 0~9
  skillLevel: number; // 0~99
}

export interface SkillAgentBulkAssignRequest {
  skillsetIds: number[];
  defaultPriority?: number;
  defaultSkillLevel?: number;
}

export interface SkillAgentBulkAssignResult {
  added: number;
  skipped: number;
}

// ──────────────────────────────────────────────────────────
//  스킬모음 (SkillGroup)
// ──────────────────────────────────────────────────────────

export interface SkillGroupResponse {
  skillGroupId: number;
  tenantId: number;
  tenantName: string | null;
  skillGroupName: string;
  skillGroupDesc: string | null;
  memberCount: number;
  updateDate?: string | null;
  workUser?: number | null;
  workTime?: string | null;
}

export interface SkillGroupMemberResponse {
  skillGroupId: number;
  skillsetId: number;
  skillsetName: string;
  skillsetDesc: string | null;
  mediaType: number | null;
  tenantId: number;
  tenantName: string | null;
  activateYn: number | null;
  priority: number | null;
  skillLevel: number | null;
}

export interface SkillGroupMemberRequest {
  skillsetId: number;
  priority?: number;
  skillLevel?: number;
}

export interface SkillGroupCreateRequest {
  tenantId?: number;
  skillGroupName: string;
  skillGroupDesc?: string;
  members?: SkillGroupMemberRequest[];
}

export interface SkillGroupUpdateRequest {
  skillGroupName: string;
  skillGroupDesc?: string;
  members?: SkillGroupMemberRequest[]; // null = 멤버 변경 없음, [] = 모두 제거
}

/**
 * 스킬모음 → 상담사 일괄 적용 (병합/upsert).
 * BE 계약: POST /api/ipron/skill-groups/{skillGroupId}/apply  body { agentIds: number[] }
 * 모음 멤버(스킬셋×P/L)를 선택 상담사 N명에 전개 — 기존 타 스킬 보존, 동일 스킬셋은 모음 P/L 로 갱신.
 */
export interface SkillGroupApplyRequest {
  agentIds: number[];
}

/** apply 결과 (BE SkillGroupApplyResult record 정합 — 2026-06-10 확정) */
export interface SkillGroupApplyResult {
  agentCount: number;
  memberCount: number;
  added: number;
  updated: number;
}

// ──────────────────────────────────────────────────────────
//  Query params
// ──────────────────────────────────────────────────────────

export interface AvailableSkillsetParams {
  tenantId?: number;
  keyword?: string;
  activeYn?: number;
}

export interface SkillGroupListParams {
  tenantId?: number;
}
