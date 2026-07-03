/**
 * IVR 업무시간관리 (ivr-worktime) 도메인 타입.
 *
 * AS-IS: SWAT IPR30S4022 (WORKTIME_TYPE='IR').
 * BE: BT-ADMIN-SERVICE-IPRON — 패키지 ipron.ivrworktime.
 *
 * IR 은 마스터당 슬롯이 정확히 1개 → 마스터 + 슬롯을 단일 폼으로 관리(flatten).
 */

/** IR 업무시간 (마스터 + 단일 슬롯 flatten) */
export interface IrWorktime {
  worktimeId: number;
  tenantId: number | null;
  tenantName: string | null;
  worktimeName: string;
  groupKey: string;
  worktimeDesc: string | null;
  // 단일 슬롯 (미등록 시 null)
  listSeq: number | null;
  weekdayByte: string | null; // 8자리 [월화수목금토일휴일]
  startTime: string | null; // "HHMM"
  finishTime: string | null; // "HHMM"
  useYn: number | null; // 1=설정, 0=해제
  workTime: string | null;
}

/** IR 업무시간 등록/수정 요청 (마스터 + 슬롯 병합) */
export interface IrWorktimeRequest {
  tenantId: number;
  worktimeName: string;
  groupKey: string; // IR 필수
  worktimeDesc?: string | null;
  weekdayByte: string; // 8자리
  startTime: string; // "HHMM"
  finishTime: string; // "HHMM"
  useYn: number; // 1/0
}
