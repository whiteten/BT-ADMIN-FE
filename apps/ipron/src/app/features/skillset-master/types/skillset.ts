/**
 * 스킬셋 관리 (ipron-skillset-master) 도메인 타입
 *
 * AS-IS: SWAT IPR20S5010
 * BE: BT-ADMIN-SERVICE-IPRON
 *   /api/ipron/skillsets             스킬셋 마스터
 *   /api/ipron/skillset-groups       업무그룹 트리
 *   /api/ipron/skillset-members      스킬셋↔그룹 매핑
 */

export interface SkillsetResponse {
  skillsetId: number;
  skillsetName: string;
  skillsetDesc: string | null;
  tenantId: number;
  tenantName: string | null;
  treeId: number | null;
  treeName: string | null;
  mediaType: number | null;
  activateYn: number;
  sortSeq: number | null;
  agentCount: number;
  workTime: string | null;
}

export interface SkillsetCreateRequest {
  tenantId?: number | null;
  treeId?: number | null;
  skillsetName: string;
  skillsetDesc?: string | null;
  mediaType: number;
  activateYn: number;
  sortSeq?: number | null;
}

export interface SkillsetUpdateRequest {
  treeId?: number | null;
  skillsetName: string;
  skillsetDesc?: string | null;
  mediaType: number;
  activateYn: number;
  sortSeq?: number | null;
}

export interface SkillsetTenantStat {
  tenantId: number;
  tenantName: string | null;
  skillsetCount: number;
  groupCount: number;
  mappingCount: number;
  unassignedCount: number;
}

export interface SkillsetGroupResponse {
  treeId: number;
  tenantId: number;
  tenantName: string | null;
  treeName: string;
  priorTreeId: number | null;
  treeDepth: number | null;
  sortSeq: number | null;
  skillsetCount: number;
  children: SkillsetGroupResponse[];
}

export interface SkillsetGroupCreateRequest {
  tenantId: number;
  priorTreeId?: number | null;
  treeName: string;
  sortSeq?: number | null;
}

export interface SkillsetGroupUpdateRequest {
  treeName: string;
  sortSeq?: number | null;
}

export interface SkillsetMemberReassignRequest {
  skillsetIds: number[];
  targetTreeId?: number | null;
}

// ─── 스케줄 관리 (TB_IC_SCHEDULEINFO + TB_IC_SKILLSCHEDULE) ───────────────────

export interface ScheduleInfoResponse {
  scheduleId: number;
  scheduleName: string;
  tenantId: number | null;
  tenantName: string | null;
  startDate: string | null; // ISO yyyy-MM-dd
  startTime: string | null; // "HHMM"
  finshTime: string | null; // "HHMM"
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  workTime: string | null;
}

export interface ScheduleInfoRequest {
  tenantId?: number | null;
  scheduleName: string;
  startDate?: string | null; // ISO yyyy-MM-dd
  startTime?: string | null; // "HHMM"
  finshTime?: string | null; // "HHMM"
  mon?: number;
  tue?: number;
  wed?: number;
  thu?: number;
  fri?: number;
  sat?: number;
  sun?: number;
}

/** 요일 컬럼 정의 (월~일 순) */
export const SCHEDULE_DAY_FIELDS: { key: keyof Pick<ScheduleInfoResponse, 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>; label: string }[] = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
];

/** 미디어 타입 공통코드 (IC_MEDIA_TYPE) — DB 조회 결과 (2026-05-25) */
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
