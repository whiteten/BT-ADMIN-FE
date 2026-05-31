/**
 * 상담사 관리 도메인 타입
 *
 * AS-IS: SWAT IPR20S4010 (상담사) / IPR20S4020 (상담그룹)
 * BE: BT-ADMIN-SERVICE-IPRON
 *   `/api/ipron/agents`        — 상담사 마스터
 *   `/api/ipron/agent-groups`  — 상담그룹 마스터
 */

// ─── 미디어 매트릭스 (8 미디어 × 7 속성) ─────────────────────────────────

export interface AgentMediaOption {
  use: boolean | null;
  autoansUse: boolean | null;
  autoanswerMode: number | null;
  autoanswerTime: number | null;
  util: number | null;
  max: number | null;
  afctime: number | null;
}

export interface AgentMediaMatrix {
  chat: AgentMediaOption | null;
  videoVoice: AgentMediaOption | null;
  videoChat: AgentMediaOption | null;
  email: AgentMediaOption | null;
  fax: AgentMediaOption | null;
  voip: AgentMediaOption | null;
  mvoip: AgentMediaOption | null;
  sms: AgentMediaOption | null;
}

// ─── 상담사 ───────────────────────────────────────────────────────────────

export interface AgentResponse {
  agentId: number;
  agentLoginId: string;
  tenantId: number;
  tenantName: string | null;
  groupId: number;
  groupName: string | null;
  nodeId: number | null;
  nodeName: string | null;
  backUpNodeId: number | null;
  backUpNodeName: string | null;
  pbxLoginId: string | null;
  agentName: string;
  agentAlias: string;
  agentGrade: string | null;
  jikgup: string | null;
  oscomId: number | null;
  activateYn: number; // 0/1
  retireYn: number; // 0/1
  agentStatus: string | null;
  useGrpMdaOpt: number; // 0/1
  useGrpSkill: number; // 0/1 — 그룹 스킬 배정 옵션
  masterCtiqId: number | null;
  monitorSvc: number | null;
  coachingSvc: number | null;
  mediaMatrix: AgentMediaMatrix | null;
  workUser: number | null;
  workUserName: string | null;
  workTime: string | null;
}

export interface AgentCreateRequest {
  tenantId: number;
  groupId: number;
  agentLoginId: string;
  agentName: string;
  agentAlias: string;
  password: string;
  agentGrade?: string;
  jikgup?: string;
  oscomId?: number;
  activateYn?: number;
  retireYn?: number;
  useGrpMdaOpt?: number;
  useGrpSkill?: number;
  masterCtiqId?: number;
  monitorSvc?: number;
  coachingSvc?: number;
  mediaMatrix?: AgentMediaMatrix | null;
}

export interface AgentUpdateRequest {
  groupId: number;
  agentName: string;
  agentAlias: string;
  password?: string; // 미입력 시 변경 안함
  agentGrade?: string;
  jikgup?: string;
  oscomId?: number;
  activateYn?: number;
  retireYn?: number;
  useGrpMdaOpt?: number;
  useGrpSkill?: number;
  masterCtiqId?: number;
  monitorSvc?: number;
  coachingSvc?: number;
  mediaMatrix?: AgentMediaMatrix | null;
}

export interface AgentMoveRequest {
  targetGroupId: number;
  allowTenantChange?: boolean;
}

export interface AgentTenantStat {
  tenantId: number;
  tenantName: string | null;
  totalCnt: number;
  activeCnt: number;
  unassignedAdnCnt: number;
}

export interface AgentDuplicateCheckParams {
  tenantId: number;
  agentLoginId: string;
  excludeAgentId?: number;
}

// ─── 상담그룹 ─────────────────────────────────────────────────────────────

export interface AgentGroupNode {
  groupId: number;
  tenantId: number;
  tenantName: string | null;
  priorGrpId: number | null;
  grpDepth: number;
  groupName: string;
  activateYn: number;
  agentCount: number;
  children: AgentGroupNode[];
}

export interface AgentGroupResponse {
  groupId: number;
  tenantId: number;
  tenantName: string | null;
  priorGrpId: number | null;
  priorGroupName: string | null;
  grpHierarchy: string | null;
  grpDepth: number;
  groupName: string;
  grpAniNo: string | null;
  grpAniYn: number | null;
  oscomId: number | null;
  activateYn: number;
  mediaMatrix: AgentMediaMatrix | null;
  workUser: number | null;
  workTime: string | null;
}

export interface AgentGroupCreateRequest {
  tenantId: number;
  priorGrpId?: number | null;
  groupName: string;
  grpAniNo?: string;
  grpAniYn?: number;
  oscomId?: number;
  activateYn?: number;
  mediaMatrix?: AgentMediaMatrix | null;
}

export interface AgentGroupUpdateRequest {
  groupName: string;
  grpAniNo?: string;
  grpAniYn?: number;
  oscomId?: number;
  activateYn?: number;
  mediaMatrix?: AgentMediaMatrix | null;
}

/** 그룹 트리 D&D 재배치 (BEFORE/AFTER/INSIDE). */
export type AgentGroupReorderPosition = 'BEFORE' | 'AFTER' | 'INSIDE';

export interface AgentGroupReorderRequest {
  position: AgentGroupReorderPosition;
  referenceGroupId?: number; // BEFORE/AFTER 일 때 형제 기준점, INSIDE 일 때 새 부모
  targetPriorGrpId?: number; // 참조 노드 없이 부모만 지정할 때
}
