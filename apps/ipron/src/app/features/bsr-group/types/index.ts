/**
 * BSR 그룹 관리 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/bsr-groups`
 *   - TB_IC_BSR_GROUPMASTER (PK: bsrGroupId)
 *   - 서브그리드: 스케줄 배정 (TB_IC_BSR_GROUPSCHEDULE junction)
 */

// ──────────────────────────────────────────────────────────
//  BSR 그룹 마스터 (응답)
// ──────────────────────────────────────────────────────────

export interface BsrGroupResponse {
  bsrGroupId: number;
  bsrGroupName: string | null;
  bsrGroupDesc: string | null;
  companyId: number | null;
  tenantId: number | null;
  tenantName: string | null;
  bsrMethod: string | null;
  bsrMethodName: string | null;
  activateYn: number | null;
  readyAgentRoutingYn: number | null;
  readyAgentQueueRoutingYn: number | null;
  sortSeq: number | null;
  createDate: string | null;
  workUser: number | null;
  workTime: string | null;
  areacodeRoutingYn: number | null;
  areacodeRoutingQueue02: string | null;
  areacodeRoutingQueue031: string | null;
  areacodeRoutingQueue032: string | null;
  areacodeRoutingQueue033: string | null;
  areacodeRoutingQueue041: string | null;
  areacodeRoutingQueue042: string | null;
  areacodeRoutingQueue043: string | null;
  areacodeRoutingQueue044: string | null;
  areacodeRoutingQueue051: string | null;
  areacodeRoutingQueue052: string | null;
  areacodeRoutingQueue053: string | null;
  areacodeRoutingQueue054: string | null;
  areacodeRoutingQueue055: string | null;
  areacodeRoutingQueue061: string | null;
  areacodeRoutingQueue062: string | null;
  areacodeRoutingQueue063: string | null;
  areacodeRoutingQueue064: string | null;
  serviceLevelTime: number | null;
}

export interface BsrGroupTenantStat {
  tenantId: number;
  tenantName: string | null;
  bsrGroupCount: number;
}

export interface BsrGroupCreateRequest {
  tenantId: number;
  bsrGroupName: string;
  bsrGroupDesc: string;
  bsrMethod: string;
  activateYn?: number;
  readyAgentRoutingYn?: number;
  readyAgentQueueRoutingYn?: number;
  sortSeq?: number;
  serviceLevelTime?: number;
  areacodeRoutingYn?: number;
  areacodeRoutingQueue02?: string;
  areacodeRoutingQueue031?: string;
  areacodeRoutingQueue032?: string;
  areacodeRoutingQueue033?: string;
  areacodeRoutingQueue041?: string;
  areacodeRoutingQueue042?: string;
  areacodeRoutingQueue043?: string;
  areacodeRoutingQueue044?: string;
  areacodeRoutingQueue051?: string;
  areacodeRoutingQueue052?: string;
  areacodeRoutingQueue053?: string;
  areacodeRoutingQueue054?: string;
  areacodeRoutingQueue055?: string;
  areacodeRoutingQueue061?: string;
  areacodeRoutingQueue062?: string;
  areacodeRoutingQueue063?: string;
  areacodeRoutingQueue064?: string;
}

export type BsrGroupUpdateRequest = BsrGroupCreateRequest;

// ──────────────────────────────────────────────────────────
//  BSR 스케줄 메타
// ──────────────────────────────────────────────────────────

export interface BsrScheduleInfoResponse {
  bsrScheduleId: number;
  bsrScheduleName: string | null;
  tenantId: number | null;
  tenantName: string | null;
  bsrGroupId: number | null;
  startDate: string | null;
  startTime: string | null;
  finshTime: string | null;
  mon: number | null;
  tue: number | null;
  wed: number | null;
  thu: number | null;
  fri: number | null;
  sat: number | null;
  sun: number | null;
  workUser: number | null;
  workTime: string | null;
}

export interface BsrScheduleInfoCreateRequest {
  tenantId: number;
  bsrScheduleName: string;
  startDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HHMM'
  finshTime: string; // 'HHMM'
  mon?: number;
  tue?: number;
  wed?: number;
  thu?: number;
  fri?: number;
  sat?: number;
  sun?: number;
}

export type BsrScheduleInfoUpdateRequest = BsrScheduleInfoCreateRequest;

// ──────────────────────────────────────────────────────────
//  BSR 메소드 (CtiBsrMethod 9종)
// ──────────────────────────────────────────────────────────

// DB TB_CC_COMMONCODE WHERE CLASS_CD='IC_BSR_METHOD' 한자리 CODE_CD 정합 (2026-06-07 수정)
export const BSR_METHOD_OPTIONS = [
  { value: '1', label: '최소 예상대기시간 우선' },
  { value: '2', label: '최소 대기 고객 우선' },
  { value: '3', label: '상담원 수 대비 최소 대기 고객 우선' },
  { value: '4', label: '최소 인입 합계 우선' },
  { value: '5', label: '균등분배(Round Robin)' },
  { value: '6', label: '점진적 최소인입 합계 우선' },
  { value: '7', label: '최소 고객대기율 우선' },
  { value: '8', label: '최대 응대율 우선' },
  { value: '9', label: '최대 서비스 레벨 우선' },
] as const;

export const getBsrMethodLabel = (code: string | null | undefined): string => {
  if (!code) return '-';
  return BSR_METHOD_OPTIONS.find((o) => o.value === code)?.label ?? code;
};

// ──────────────────────────────────────────────────────────
//  지역번호 라우팅 17개 컬럼 메타
// ──────────────────────────────────────────────────────────

export const AREACODE_FIELDS = [
  { key: 'areacodeRoutingQueue02', label: '서울 (02)' },
  { key: 'areacodeRoutingQueue031', label: '경기 (031)' },
  { key: 'areacodeRoutingQueue032', label: '인천 (032)' },
  { key: 'areacodeRoutingQueue033', label: '강원 (033)' },
  { key: 'areacodeRoutingQueue041', label: '충남 (041)' },
  { key: 'areacodeRoutingQueue042', label: '대전 (042)' },
  { key: 'areacodeRoutingQueue043', label: '충북 (043)' },
  { key: 'areacodeRoutingQueue044', label: '세종 (044)' },
  { key: 'areacodeRoutingQueue051', label: '부산 (051)' },
  { key: 'areacodeRoutingQueue052', label: '울산 (052)' },
  { key: 'areacodeRoutingQueue053', label: '대구 (053)' },
  { key: 'areacodeRoutingQueue054', label: '경북 (054)' },
  { key: 'areacodeRoutingQueue055', label: '경남 (055)' },
  { key: 'areacodeRoutingQueue061', label: '전남 (061)' },
  { key: 'areacodeRoutingQueue062', label: '광주 (062)' },
  { key: 'areacodeRoutingQueue063', label: '전북 (063)' },
  { key: 'areacodeRoutingQueue064', label: '제주 (064)' },
] as const;

export type AreacodeFieldKey = (typeof AREACODE_FIELDS)[number]['key'];
