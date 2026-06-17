/**
 * CTI 큐 관리 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/cti-queues`
 *   - TB_IC_CTIQ_MASTER (PK: ctiqId) + TB_IE_GDN_MASTER (GDN_TYPE=17) 결합
 *   - "그룹DN 생성 = 즉시 큐번호" 모델: 등록 시 tenantId/nodeId/gdnNo/gdnName 필수.
 *   - 서브그리드: BSR 스케줄 / 목표 SLT 스케줄 (배정 junction).
 */

// ──────────────────────────────────────────────────────────
//  CTI 큐 마스터 (응답)
// ──────────────────────────────────────────────────────────

export interface CtiQueueResponse {
  ctiqId: number;
  gdnId: number | null;
  // 그룹DN(GDN_MASTER) join 필드
  gdnNo: string | null;
  gdnName: string | null;
  nodeId: number | null;
  tenantId: number | null;
  tenantName: string | null;
  accessCodeProfileId: number | null;
  drAccessCodeProfileId: number | null;
  // 초기구성(GDN_MASTER 멘트/블록/라우팅)
  initMent: number | null;
  waitMent: number | null;
  closeMent: number | null;
  blockMent: number | null;
  connMent: number | null;
  holdMent: number | null;
  coConnMent: number | null;
  coHoldMent: number | null;
  blockYn: number | null;
  closeType: number | null;
  errorRoutingDnis: string | null;
  blockRoutingDnis: string | null;
  busyRoutingDnis: string | null;
  // 큐설정
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
  // 라우팅
  forceTransYn: number | null;
  firstGroupId: number | null;
  routingType: number | null;
  routingKind: number | null;
  routingPriority: number | null;
  reconnPriorityYn: number | null;
  // BSR
  bsrGroupId: number | null;
  bsrWeight: number | null;
  bsrYn: number | null;
  bsrDistributeYn: number | null;
  // 상태
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
  // 업무그룹 (TB_TR_CTIQ_MEMBER → TB_TR_CTIQ_MASTER)
  treeId: number | null;
  treeName: string | null;
  // 예약 적용 (TB_IC_CTIQ_ROUTING — SWAT IC_CtiqRouting 정합)
  applyType: number | null; // 0=즉시, 1=예약
  applyDatetime: string | null; // 'YYYYMMDDHHmm' 14자리
}

// ──────────────────────────────────────────────────────────
//  업무그룹 트리 (TB_TR_CTIQ_MASTER) — 스킬셋 관리와 동형
// ──────────────────────────────────────────────────────────

export interface CtiQueueGroupResponse {
  treeId: number;
  tenantId: number;
  tenantName: string | null;
  treeName: string;
  priorTreeId: number | null;
  treeDepth: number | null;
  sortSeq: number | null;
  ctiqCount: number;
  children: CtiQueueGroupResponse[];
}

export interface CtiQueueGroupCreateRequest {
  tenantId: number;
  priorTreeId?: number | null;
  treeName: string;
  sortSeq?: number | null;
}

export interface CtiQueueGroupUpdateRequest {
  treeName: string;
  sortSeq?: number | null;
}

export interface CtiQueueMemberReassignRequest {
  ctiqIds: number[];
  targetTreeId?: number | null;
}

/** 업무그룹 트리 D&D 재배치 — AgentGroupReorderRequest 패턴 동일 */
export type CtiQueueGroupReorderPosition = 'BEFORE' | 'AFTER' | 'INSIDE';

export interface CtiQueueGroupReorderRequest {
  position: CtiQueueGroupReorderPosition;
  referenceTreeId: number;
  targetPriorTreeId?: number | null;
}

// ──────────────────────────────────────────────────────────
//  CTI 큐 등록/수정 요청
// ──────────────────────────────────────────────────────────

export interface CtiQueueCreateRequest {
  // 그룹DN(결합 생성)
  tenantId: number;
  nodeId: number;
  gdnNo: string;
  gdnName: string;
  // 기본정보
  ctiqName: string;
  ctiqDesc?: string;
  inoutKind?: number;
  sortSeq?: number;
  activateYn?: number;
  globalDnYn?: number;
  backUpNodeId?: number | null;
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;
  // 초기구성
  initMent?: number | null;
  waitMent?: number | null;
  closeMent?: number | null;
  blockMent?: number | null;
  connMent?: number | null;
  holdMent?: number | null;
  coConnMent?: number | null;
  coHoldMent?: number | null;
  blockYn?: number;
  closeType?: number;
  errorRoutingDnis?: string;
  blockRoutingDnis?: string;
  busyRoutingDnis?: string;
  // 대기 / 타임아웃 / 서비스레벨
  maxWaittimeYn?: number;
  maxWaittime?: number;
  collectYn?: number;
  collectTimeout?: number;
  serviceLevelTime?: number;
  abandonAcktime?: number;
  serviceLevelTargetYn?: number;
  serviceLevelTargetValue?: number;
  // 호우회
  overflowQid?: string;
  overflowCnt?: number;
  // 라우팅
  firstGroupId?: number | null;
  routingPriority?: number;
  routingType?: number;
  routingKind?: number;
  reconnPriorityYn?: number;
  forceTransYn?: number;
  // BSR
  bsrYn?: number;
  bsrDistributeYn?: number;
  bsrGroupId?: number | null;
  bsrWeight?: number;
  // 미디어별 스킬
  voipSkillId?: number | null;
  voipSkillLevel?: number;
  chatSkillId?: number | null;
  chatSkillLevel?: number;
  emailSkillId?: number | null;
  emailSkillLevel?: number;
  faxSkillId?: number | null;
  faxSkillLevel?: number;
  videoVoiceSkillId?: number | null;
  videoVoiceSkillLevel?: number;
  videoChatSkillId?: number | null;
  videoChatSkillLevel?: number;
  mvoipSkillId?: number | null;
  mvoipSkillLevel?: number;
  smsSkillId?: number | null;
  smsSkillLevel?: number;
  // 예약 적용 (TB_IC_CTIQ_ROUTING)
  applyType?: number | null; // 0=즉시, 1=예약
  applyDatetime?: string | null; // 'YYYYMMDDHHmm'
}

/** 수정: ctiqId/gdnId/gdnNo/노드/테넌트 불변 (gdnName 은 변경 가능). */
export type CtiQueueUpdateRequest = Partial<Omit<CtiQueueCreateRequest, 'tenantId' | 'nodeId' | 'gdnNo'>> & {
  gdnName?: string;
};

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

// ──────────────────────────────────────────────────────────
//  콤보 옵션
// ──────────────────────────────────────────────────────────

/** 라우팅그룹 / 스킬셋 / BSR 그룹 공용 옵션 (BE: CtiQueueOptionItem). */
export interface CtiQueueOptionItem {
  id: number;
  name: string;
}

/** 접근코드 프로파일 콤보 옵션 (access-profile-list flow 재사용 — id=accessCodeProfileId). */
export interface AccessCodeProfileOption {
  id: number;
  name: string;
}

/** 라이선스 미디어 (BE: CtiQueueMediaOption). */
export interface CtiQueueMediaOption {
  mediaType: number; // 0=VOIP, 10=Chat, 20=VideoVoice, 30=VideoChat, 40=eMail, 50=Fax, 61=mVOIP, 80=WEB
  mediaAlias: string | null;
}

// ──────────────────────────────────────────────────────────
//  서브그리드: BSR 스케줄 / SLT 스케줄
// ──────────────────────────────────────────────────────────

export interface QuebsrScheduleResponse {
  quebsrScheduleId: number;
  quebsrScheduleName: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  finishTime: string | null;
  mon: number | null;
  tue: number | null;
  wed: number | null;
  thu: number | null;
  fri: number | null;
  sat: number | null;
  sun: number | null;
  useMonthRepeat: number | null;
  useBsrWeight: number | null;
  bsrWeight: number | null;
  useBsrIncomYn: number | null;
  useBsrRdyrouteYn: number | null;
}

export interface SltScheduleResponse {
  sltScheduleId: number;
  sltScheduleName: string | null;
  startDate: string | null;
  startTime: string | null;
  finshTime: string | null; // BE 오타 컬럼 그대로 유지
  mon: number | null;
  tue: number | null;
  wed: number | null;
  thu: number | null;
  fri: number | null;
  sat: number | null;
  sun: number | null;
}

/** 스케줄 배정 요청 (BSR / SLT 공용). */
export interface ScheduleAssignRequest {
  scheduleIds: number[];
}

// ──────────────────────────────────────────────────────────
//  미디어별 스킬 매핑 (라우팅정보 탭)
// ──────────────────────────────────────────────────────────

/** 미디어 타입 코드 → CtiQueue Create/Update 의 skillId/skillLevel 필드 prefix 매핑. */
export const MEDIA_SKILL_FIELD_MAP: Record<number, { idKey: keyof CtiQueueCreateRequest; levelKey: keyof CtiQueueCreateRequest; label: string }> = {
  0: { idKey: 'voipSkillId', levelKey: 'voipSkillLevel', label: 'VOIP 기본 SKILL' },
  10: { idKey: 'chatSkillId', levelKey: 'chatSkillLevel', label: 'Chat 기본 SKILL' },
  20: { idKey: 'videoVoiceSkillId', levelKey: 'videoVoiceSkillLevel', label: 'Video Voice 기본 SKILL' },
  30: { idKey: 'videoChatSkillId', levelKey: 'videoChatSkillLevel', label: 'Video Chat 기본 SKILL' },
  40: { idKey: 'emailSkillId', levelKey: 'emailSkillLevel', label: 'e-Mail 기본 SKILL' },
  50: { idKey: 'faxSkillId', levelKey: 'faxSkillLevel', label: 'FAX 기본 SKILL' },
  61: { idKey: 'mvoipSkillId', levelKey: 'mvoipSkillLevel', label: 'mVOIP 기본 SKILL' },
  80: { idKey: 'smsSkillId', levelKey: 'smsSkillLevel', label: 'WEB 기본 SKILL' },
};

// ──────────────────────────────────────────────────────────
//  Enum / Lookup (콤보 라벨)
// ──────────────────────────────────────────────────────────

export const INOUT_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'I/B (인바운드)' },
  { value: 1, label: 'O/B (아웃바운드)' },
];

export const ROUTING_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '최장대기(직전대기시간)' },
  { value: 2, label: '최소콜수(전체응대콜수)' },
  { value: 3, label: '최소시간(전체응대시간)' },
  { value: 4, label: '균등분배(Round-Robin)' },
  { value: 5, label: '최장대기(누적대기시간)' },
  { value: 6, label: '최소콜수(큐별응대콜수)' },
  { value: 7, label: '최소시간(큐별응대시간)' },
];

export const ROUTING_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Skill-Based Routing' },
  { value: 2, label: 'Group Routing' },
  { value: 3, label: 'Skill-Based Group Routing' },
];

export const CLOSE_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '정상 종료' },
  { value: 1, label: '멘트 후 종료' },
  { value: 2, label: '우회 DN/GDN 라우팅' },
  { value: 3, label: '멘트 후 우회 DN/GDN 라우팅' },
];

// ──────────────────────────────────────────────────────────
//  일괄 설정 (Bulk Update) — P1
// ──────────────────────────────────────────────────────────

/**
 * 일괄 설정 요청 DTO (BE CtiQueueBulkUpdateRequest 정합).
 * fields: 변경할 필드명 배열 (field mask — 미포함 필드는 서버측 보존).
 * applyType: 0=즉시, 1=예약.
 * applyDatetime: 예약 시 'YYYYMMDDHHmm' 형식.
 */
export interface CtiQueueBulkUpdateRequest {
  ctiqIds: number[];
  fields: string[];
  // 멘트
  initMent?: number | null;
  waitMent?: number | null;
  closeMent?: number | null;
  blockMent?: number | null;
  connMent?: number | null;
  holdMent?: number | null;
  coConnMent?: number | null;
  coHoldMent?: number | null;
  // 스킬 (8종 전체)
  voipSkillId?: number | null;
  voipSkillLevel?: number;
  chatSkillId?: number | null;
  chatSkillLevel?: number;
  videoVoiceSkillId?: number | null;
  videoVoiceSkillLevel?: number;
  videoChatSkillId?: number | null;
  videoChatSkillLevel?: number;
  emailSkillId?: number | null;
  emailSkillLevel?: number;
  faxSkillId?: number | null;
  faxSkillLevel?: number;
  mvoipSkillId?: number | null;
  mvoipSkillLevel?: number;
  smsSkillId?: number | null;
  smsSkillLevel?: number;
  // 라우팅
  firstGroupId?: number | null;
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;
  routingType?: number;
  routingPriority?: number;
  // 큐 정책
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
  activateYn?: number;
  blockYn?: number;
  reconnPriorityYn?: number;
  forceTransYn?: number;
  // 예약 적용
  applyType?: number | null;
  applyDatetime?: string | null;
}

/** 일괄 설정 결과 — 실패 건 (BE CtiQueueBulkResult.FailedItem 정합). */
export interface CtiQueueBulkItemResult {
  ctiqId: number;
  message: string | null;
}

/** 일괄 설정 결과 (BE CtiQueueBulkResult record 정합: successCount/totalCount/failures). */
export interface CtiQueueBulkResult {
  successCount: number;
  totalCount: number;
  failures: CtiQueueBulkItemResult[];
}

// ──────────────────────────────────────────────────────────
//  미디어 스킬 매트릭스 일괄 저장 (스킬 배정 보기 토글)
// ──────────────────────────────────────────────────────────

/**
 * 미디어 스킬 매트릭스 단일 행 요청 (BE CtiQueueMediaSkillRowRequest 정합).
 * fields: 이 행에서 변경한 필드만 포함 (field mask) — 미포함 필드는 서버측 보존.
 * 큐별로 다른 스킬/레벨을 한 요청에 담는 "차등값×N" 구조 (bulk-update 의 "동일값×N" 과 대비).
 */
export interface CtiQueueMediaSkillRowRequest {
  ctiqId: number;
  fields: string[];
  voipSkillId?: number | null;
  voipSkillLevel?: number;
  chatSkillId?: number | null;
  chatSkillLevel?: number;
  emailSkillId?: number | null;
  emailSkillLevel?: number;
  faxSkillId?: number | null;
  faxSkillLevel?: number;
  videoVoiceSkillId?: number | null;
  videoVoiceSkillLevel?: number;
  videoChatSkillId?: number | null;
  videoChatSkillLevel?: number;
  mvoipSkillId?: number | null;
  mvoipSkillLevel?: number;
  smsSkillId?: number | null;
  smsSkillLevel?: number;
}

/** 미디어 스킬 매트릭스 일괄 저장 요청 (BE CtiQueueMediaSkillBatchRequest 정합, 207 응답). */
export interface CtiQueueMediaSkillBatchRequest {
  rows: CtiQueueMediaSkillRowRequest[];
}

/**
 * 미디어 스킬 매트릭스 저장 결과 (BE CtiQueueBulkResult record 실제 직렬화 정합).
 * BE: { successCount, totalCount, failures: [{ ctiqId, message }] } — 단일 step flow 이므로 BFF 무변환 통과.
 * (참고: 위 CtiQueueBulkResult FE 타입은 일괄설정 모달 전용 별도 매핑 — 본 결과는 BE record 원형을 그대로 사용.)
 */
export interface CtiQueueMediaSkillFailure {
  ctiqId: number;
  message: string | null;
}

export interface CtiQueueMediaSkillBatchResult {
  successCount: number;
  totalCount: number;
  failures: CtiQueueMediaSkillFailure[];
}

/**
 * 일괄 설정 모달에서 관리하는 필드별 값 상태.
 * checked: 이 필드를 변경 대상에 포함할지 여부 (field mask).
 */
export type BulkFieldKey =
  | 'initMent'
  | 'waitMent'
  | 'closeMent'
  | 'blockMent'
  | 'connMent'
  | 'holdMent'
  | 'coConnMent'
  | 'coHoldMent'
  | 'voipSkill'
  | 'chatSkill'
  | 'videoVoiceSkill'
  | 'videoChatSkill'
  | 'emailSkill'
  | 'faxSkill'
  | 'mvoipSkill'
  | 'smsSkill'
  | 'firstGroupId'
  | 'accessCodeProfileId'
  | 'routingType'
  | 'routingPriority'
  | 'maxWaittimeYn'
  | 'serviceLevelTime'
  | 'abandonAcktime'
  | 'overflowQid'
  | 'serviceLevelTargetYn'
  | 'activateYn'
  | 'blockYn'
  | 'reconnPriorityYn'
  | 'forceTransYn'
  | 'collectYn';

/** 필드 그룹 정의 (모달 좌측 패널 구성) */
export interface BulkFieldGroup {
  groupKey: string;
  label: string;
  fields: { key: BulkFieldKey; label: string }[];
}
