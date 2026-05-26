/**
 * CTI 큐 관리 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON/.../ctiqueue/
 *   - TB_IC_CTIQ_MASTER (PK: ctiqId, 단일 NUMBER PK)
 *   - Phase 1: CTI 큐 마스터 CRUD + 테넌트 통계
 */

// ──────────────────────────────────────────────────────────
//  CTI 큐 마스터
// ──────────────────────────────────────────────────────────

export interface CtiQueueResponse {
  ctiqId: number;
  gdnId: number | null;
  ctiqName: string | null;
  ctiqDesc: string | null;
  inoutKind: number | null; // 0=INBOUND, 1=OUTBOUND, 2=혼합
  overflowQid: string | null;
  overflowCnt: number | null;
  collectTimeout: number | null;
  collectYn: number | null;
  maxWaittime: number | null;
  maxWaittimeYn: number | null;
  abandonAcktime: number | null;
  serviceLevelTime: number | null;
  serviceLevelTargetValue: number | null;
  serviceLevelTargetYn: number | null;
  forceTransYn: number | null;
  firstGroupId: number | null;
  routingType: number | null;
  routingKind: number | null;
  routingPriority: number | null;
  reconnPriorityYn: number | null;
  bsrGroupId: number | null;
  bsrWeight: number | null;
  bsrYn: number | null;
  bsrDistributeYn: number | null;
  activateYn: number | null; // 1=활성, 0=비활성
  backUpNodeId: number | null;
  globalDnYn: number | null; // 1=O, 0=X
  sortSeq: number | null;
  // 미디어별 스킬
  voipSkillId: number | null;
  voipSkillLevel: number | null;
  chatSkillId: number | null;
  chatSkillLevel: number | null;
  emailSkillId: number | null;
  emailSkillLevel: number | null;
  faxSkillId: number | null;
  faxSkillLevel: number | null;
  videoVoiceSkillId: number | null;
  videoVoiceSkillLevel: number | null;
  videoChatSkillId: number | null;
  videoChatSkillLevel: number | null;
  mvoipSkillId: number | null;
  mvoipSkillLevel: number | null;
  smsSkillId: number | null;
  smsSkillLevel: number | null;
  // 감사
  workUser: number | null;
  workTime: string | null;
}

export interface CtiQueueCreateRequest {
  gdnId: number;
  ctiqName: string;
  ctiqDesc?: string;
  inoutKind?: number;
  sortSeq?: number;
  activateYn?: number;
  globalDnYn?: number;
  backUpNodeId?: number;
  maxWaittimeYn?: number;
  maxWaittime?: number;
  collectYn?: number;
  collectTimeout?: number;
  serviceLevelTime?: number;
  abandonAcktime?: number;
  serviceLevelTargetYn?: number;
  serviceLevelTargetValue?: number;
  overflowQid?: string;
  overflowCnt?: number;
  firstGroupId?: number;
  routingPriority?: number;
  routingType?: number;
  routingKind?: number;
  reconnPriorityYn?: number;
  forceTransYn?: number;
  bsrYn?: number;
  bsrDistributeYn?: number;
  bsrGroupId?: number;
  bsrWeight?: number;
  voipSkillId?: number;
  voipSkillLevel?: number;
  chatSkillId?: number;
  chatSkillLevel?: number;
  emailSkillId?: number;
  emailSkillLevel?: number;
  faxSkillId?: number;
  faxSkillLevel?: number;
  videoVoiceSkillId?: number;
  videoVoiceSkillLevel?: number;
  videoChatSkillId?: number;
  videoChatSkillLevel?: number;
  mvoipSkillId?: number;
  mvoipSkillLevel?: number;
  smsSkillId?: number;
  smsSkillLevel?: number;
}

export type CtiQueueUpdateRequest = Partial<Omit<CtiQueueCreateRequest, 'gdnId'>>;

// ──────────────────────────────────────────────────────────
//  테넌트 통계 (카드 슬라이더)
// ──────────────────────────────────────────────────────────

export interface CtiQueueTenantStat {
  tenantId: number | null; // null = 전체
  tenantName: string | null;
  totalCnt: number;
  activeCnt: number;
  blockedCnt: number;
}
