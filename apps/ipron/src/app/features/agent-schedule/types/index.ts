/**
 * 상담사/상담그룹 스케줄 관리 (ipron-agent-schedule) 도메인 타입.
 *
 * AS-IS: SWAT IPR20S4010(상담사 상세 스케줄 탭) / IPR20S4020(상담그룹 상세 스케줄 탭)
 * BE: BT-ADMIN-SERVICE-IPRON — 신규 패키지 agentschedule (미구현, FE 가 계약 선반영)
 *
 * 2단 데이터 모델 (REQUIREMENTS §2.1):
 *   메타(정의, 상담사·그룹 공유) + 배정(N:M, 주체별 분리)
 *   - 미디어  : TB_IC_MEDIASCHEDULEINFO  / TB_IC_AGENTMEDIASCHEDULE · TB_IC_GROUPMEDIASCHEDULE
 *   - 근무시간: TB_IC_WORKSCHEDULEINFO   / TB_IC_AGENTWORKSCHEDULE  · TB_IC_GROUPWORKSCHEDULE
 *   - 스킬    : TB_IC_AGENTSKILLSCHEDULEINFO(그룹도 공유) / TB_IC_AGENTSKILLSCHEDULE · TB_IC_GROUPSKILLSCHEDULE
 *
 * 종료시간 컬럼: FINISH_TIME (REQUIREMENTS 정정 — 3종 Info 테이블 일치).
 */

/** 스케줄 종류 탭 (메타 테이블 종속) */
export type ScheduleKind = 'media' | 'work' | 'skill';

/** 배정 주체 토글 */
export type ScheduleSubject = 'agent' | 'group';

/**
 * 스케줄 정의(메타) 공통 응답.
 * 스킬 종류일 때만 skillId/skillName/mediaType 동반.
 */
export interface ScheduleInfoResponse {
  /** PK — 미디어=mdScheduleId / 근무=workScheduleId / 스킬=skillScheduleId 의 통합 식별자 */
  scheduleId: number;
  scheduleName: string;
  tenantId: number | null;
  tenantName: string | null;
  startDate: string | null; // ISO yyyy-MM-dd
  startTime: string | null; // "HHMM"
  finishTime: string | null; // "HHMM" (FINISH_TIME)
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  /** 이 스케줄을 배정받은 주체(현재 탭 주체 기준) 수 — 삭제 가드/그리드 표기 */
  assignedCount: number;
  // ── 스킬 스케줄 전용 ──
  skillId?: number | null;
  skillName?: string | null;
  mediaType?: number | null;
  workTime: string | null;
}

/** 스케줄 정의 등록/수정 요청 */
export interface ScheduleInfoRequest {
  tenantId?: number | null;
  scheduleName: string;
  startDate?: string | null; // ISO yyyy-MM-dd
  startTime?: string | null; // "HHMM"
  finishTime?: string | null; // "HHMM"
  mon?: number;
  tue?: number;
  wed?: number;
  thu?: number;
  fri?: number;
  sat?: number;
  sun?: number;
  // ── 스킬 스케줄 전용 ──
  skillId?: number | null;
  mediaType?: number | null;
}

/** 테넌트 카드 통계 — 스케줄 정의 수 / 배정 상담사 수 / 배정 그룹 수 */
export interface ScheduleTenantStat {
  tenantId: number;
  tenantName: string | null;
  scheduleCount: number;
  assignedAgentCount: number;
  assignedGroupCount: number;
}

/**
 * 배정 대상(상담사 또는 상담그룹).
 * - 상담사: targetId=agentId, name=상담사명, loginId=로그인ID, groupName=소속그룹
 * - 상담그룹: targetId=groupId, name=그룹명, memberCount=소속 인원
 */
export interface ScheduleAssignTarget {
  targetId: number;
  name: string;
  /** 상담사 전용 — 로그인 ID */
  loginId?: string | null;
  /** 상담사 전용 — 소속 상담그룹명 */
  groupName?: string | null;
  /** 상담그룹 전용 — 소속 인원 수 */
  memberCount?: number | null;
}

/** 배정/해제 요청 — 단일 스케줄에 다수 주체 배정 */
export interface ScheduleAssignRequest {
  /** 배정/해제 대상 주체 ID 목록 */
  targetIds: number[];
  /**
   * 미디어 종류 코드 (IC_MEDIA_TYPE).
   * 미디어 탭(kind=media) 배정 시에만 포함. 근무·스킬 탭은 미포함.
   */
  mediaType?: number;
}

/** 요일 컬럼 정의 (월~일 순) — 기구현 SkillsetSchedule 정합 */
export const SCHEDULE_DAY_FIELDS: { key: keyof Pick<ScheduleInfoResponse, 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>; label: string }[] = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
];

/**
 * 미디어 타입 공통코드 (IC_MEDIA_TYPE).
 * 출처: 기구현 skillset-master MEDIA_TYPE_OPTIONS (IPRON DB 조회 2026-05-25).
 * raw 숫자 코드 노출 금지 — 라벨 매핑 전용.
 */
export const MEDIA_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Voice Over IP' },
  { value: 10, label: 'Text Chat Only' },
  { value: 20, label: 'Video + Voice' },
  { value: 30, label: 'Video + Text Chat' },
  { value: 40, label: 'E-Mail' },
  { value: 50, label: 'Fax' },
  { value: 61, label: 'Mobile VOIP' },
  { value: 80, label: 'WEB' },
];

export function getMediaTypeName(value: number | null | undefined): string {
  if (value == null) return '-';
  const found = MEDIA_TYPE_OPTIONS.find((o) => o.value === value);
  return found ? found.label : String(value);
}

/** 탭 라벨 */
export const SCHEDULE_KIND_LABELS: Record<ScheduleKind, string> = {
  media: '미디어 스케줄',
  work: '근무시간 스케줄',
  skill: '스킬 스케줄',
};

/** 주체 라벨 */
export const SUBJECT_LABELS: Record<ScheduleSubject, string> = {
  agent: '상담사',
  group: '상담그룹',
};
