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
