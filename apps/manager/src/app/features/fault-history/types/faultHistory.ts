/**
 * 장애 이력 타입 정의 (AS-IS: SWAT IPR60S5010 장애이력관리)
 * BE: BT-ADMIN-SERVICE-MANAGER /api/manager/error-histories (BFF Flow: manager-fault-history-*)
 */

/** 장애 이력 목록/이벤트 시퀀스 행 */
export interface FaultHistoryItem {
  errHistoryId: number;
  /** 장애 발생 KEY — 같은 장애 건의 이벤트 시퀀스 묶음 키 */
  errIssueKey: string | null;
  /** 발생일 (yyyyMMdd) */
  errDate: string;
  /** 발생시각 (HHmmss) */
  errTime: string;
  systemId: number | null;
  systemName: string | null;
  nodeId: number | null;
  nodeName: string | null;
  processId: number | null;
  processName: string | null;
  /** 오류코드 — 분류(2)+코드(5) 합성 문자열 */
  errCode: string | null;
  errKind: string | null;
  /** 등급 — '1' Minor / '2' Major / '3' Critical */
  errLevel: string | null;
  /** 상태 — '1' 장애발생 / '8' 복구 */
  errStatus: string | null;
  errMessage: string | null;
  errMemo: string | null;
  /** 복구시각 (yyyyMMddHHmmss, 미복구면 null) */
  errRepairTime: string | null;
}

/** 목록 검색 파라미터 (BFF flow: manager-fault-history-list) — 훅 params(Record) 호환을 위해 type 으로 선언 */
export type FaultHistoryListParams = {
  /** 발생일 시작 (yyyyMMdd) */
  from?: string;
  /** 발생일 종료 (yyyyMMdd) */
  to?: string;
  nodeId?: number;
  systemId?: number;
  processId?: number;
  errKind?: string;
  errLevel?: string;
  /** true 면 미복구만 */
  unresolvedOnly?: boolean;
  /** 오류코드 부분 검색 */
  code?: string;
  page?: number;
  size?: number;
};

/** 요약 스탯 — 조회 기간 발생 건수 / 미복구 / 미복구 Critical */
export interface FaultHistorySummary {
  /** 조회 기간(from~to) 발생 건수 */
  totalInPeriod: number;
  unresolved: number;
  unresolvedCritical: number;
}

/** 공통 페이징 응답 */
export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/** 일괄 강제복구 요청 (BFF flow: manager-fault-history-recover) */
export type FaultForceRecoverParams = {
  items: { historyId: number }[];
  /** 복구 시각 (yyyyMMddHHmmss) */
  repairTime: string;
  /** 복구 사유 (필수) */
  reason: string;
};

/** 강제복구 건별 결과 */
export interface ForceRecoverItemResult {
  historyId: number;
  success: boolean;
  /** 실패 사유 (성공 시 null) */
  message: string | null;
}

/** 일괄 강제복구 결과 — 실패 건은 미복구로 남는다 */
export interface ForceRecoverResult {
  successCount: number;
  failCount: number;
  results: ForceRecoverItemResult[];
}
