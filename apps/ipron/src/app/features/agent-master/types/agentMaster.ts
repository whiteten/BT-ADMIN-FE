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
  oscomName: string | null;
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
  /** 상담사 목록 조회 시 BE 가 함께 집계해 주는 보유 스킬 개수 (목록 응답 전용, 상세엔 없을 수 있음) */
  skillCount?: number;
}

export interface AgentCreateRequest {
  tenantId: number;
  groupId: number;
  agentLoginId: string;
  agentName: string;
  agentAlias: string;
  /** password-validation-required=false 시 미입력 허용 (undefined). BE 에서 encryptPwd 미설정. */
  password?: string;
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

/**
 * 상담사 다건 그룹 일괄 변경 요청 (BE BulkGroupChangeRequest 정합).
 * BE: PUT /api/ipron/agents/bulk-group — body: { agentIds, groupId }.
 * 단건 move 의 allowTenantChange 게이트는 없음(벌크는 그룹 이동을 무조건 적용).
 */
export interface BulkGroupChangeRequest {
  agentIds: number[];
  groupId: number;
}

/** 벌크 변경 결과 (BE BulkChangeResult 정합, 207 best-effort). */
export interface BulkChangeResult {
  successCount: number;
  failCount: number;
  failures: { agentId: number; reason: string }[];
}

/**
 * 상담사 미디어 벌크 변경 요청 (BE AgentBulkMediaRequest 정합).
 * BE: PUT /api/ipron/agents/bulk-media — body: { items: [{agentId, useGrpMdaOpt, mediaMatrix}] }.
 * 미디어 필드(useGrpMdaOpt + mediaMatrix)만 행별 부분갱신. 단일 트랜잭션 전체 롤백.
 */
export interface AgentBulkMediaItem {
  agentId: number;
  useGrpMdaOpt?: number;
  mediaMatrix?: AgentMediaMatrix | null;
}

export interface AgentBulkMediaRequest {
  items: AgentBulkMediaItem[];
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

/** 상담사 비밀번호 정책 설정 (BE ipron.agent.* 대응). */
export interface AgentConfig {
  /** 등록 시 비밀번호 필수 여부. SWAT Globals.AgentPasswordValidation */
  passwordValidationRequired: boolean;
  /** 비밀번호 복잡도/길이 정책 사용 여부. SWAT Globals.AgentPasswordPolicyUse */
  passwordPolicyUse: boolean;
}

// ─── 상담그룹 ─────────────────────────────────────────────────────────────

export interface AgentGroupNode {
  groupId: number;
  tenantId: number;
  tenantName: string | null;
  priorGrpId: number | null;
  grpDepth: number;
  groupName: string;
  oscomId: number | null;
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

// ─── 아웃소싱업체(oscom) 마스터 ─────────────────────────────────────────────

/**
 * 아웃소싱업체 콤보 옵션. SWAT 정합: cbCreate("#poOscomId","oscom",...) — 업체 마스터 콤보.
 * BE: GET /api/ipron/oscoms (현재 테넌트 필터는 BE 처리, FE 는 호출만) → ApiResponse<List<Oscom>>.
 */
export interface Oscom {
  oscomId: number;
  oscomName: string;
  oscomAlias: string;
}

/** 그룹 트리 D&D 재배치 (BEFORE/AFTER/INSIDE). */
export type AgentGroupReorderPosition = 'BEFORE' | 'AFTER' | 'INSIDE';

export interface AgentGroupReorderRequest {
  position: AgentGroupReorderPosition;
  referenceGroupId?: number; // BEFORE/AFTER 일 때 형제 기준점, INSIDE 일 때 새 부모
  targetPriorGrpId?: number; // 참조 노드 없이 부모만 지정할 때
}
