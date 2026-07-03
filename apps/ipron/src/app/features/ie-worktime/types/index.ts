/**
 * 교환기 업무시간관리 (ipron-pbx-worktime) 도메인 타입.
 *
 * AS-IS: SWAT IPR30S4022 (WORKTIME_TYPE='IE').
 * BE: BT-ADMIN-SERVICE-IPRON — 패키지 ieworktime.
 *
 * IE 는 마스터당 슬롯 N개 → 마스터 / 슬롯 분리 관리.
 */

/** IE 업무시간 마스터 */
export interface IeWorktimeMaster {
  worktimeId: number;
  tenantId: number | null;
  tenantName: string | null;
  worktimeName: string;
  groupKey: string | null;
  worktimeDesc: string | null;
  slotCount: number;
  workTime: string | null;
}

/** IE 마스터 등록/수정 요청 */
export interface IeWorktimeMasterRequest {
  tenantId: number;
  worktimeName: string;
  groupKey?: string | null; // IE 선택 (입력 시 타입 내 유일)
  worktimeDesc?: string | null;
}

/** IE 업무시간 슬롯 (시간대) */
export interface IeWorktimeSlot {
  worktimeId: number;
  listSeq: number;
  weekdayByte: string | null; // 8자리
  startTime: string | null; // "HHMM"
  finishTime: string | null; // "HHMM"
  useYn: number | null; // 1/0
}

/** IE 슬롯 등록/수정 요청 */
export interface IeWorktimeSlotRequest {
  weekdayByte: string;
  startTime: string; // "HHMM"
  finishTime: string; // "HHMM"
  useYn: number;
}
