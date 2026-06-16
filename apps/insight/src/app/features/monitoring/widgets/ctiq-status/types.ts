/**
 * BE INSIGHT CtiqStatusWidget(`widgetType = "ctiq-status-matrix"`) 응답 row 타입.
 *
 * 레거시 SWAT `ctiqStatus.jsp` 의 Redis row(`MON:CTIQ_STATUS`)와 1:1 매핑.
 * BE 는 Redis 값을 그대로 직렬화 + KPI ÷100 정규화만 적용. 모든 필드는 선택적.
 */
export interface CtiqRow {
  // ─── 식별 / 조직 ──────────────────────────────────────────────
  CTIQ_ID?: number | string;
  CTIQ_NAME?: string;
  /** 큐 GDN 번호 (큐 DN). */
  GDN_NO?: string | number;
  NODE_ID?: number | string;
  CENTER_ID?: number | string;
  TENANT_ID?: number | string;
  TNT_ID?: number | string;
  MEDIA_TYPE?: number | string;
  /** 서비스 미디어 타입 — 0:VOIP, 10:CHAT, 20:VIDEO 등 */
  SERVICE_MEDIA_TYPE?: number | string;

  // ─── 압력 (현재 시점) ──────────────────────────────────────────
  /** 현재 대기 콜 수 */
  RTS_WAIT_CNT?: number | string;
  /** 최장 대기시간 (초) */
  RTS_MAXWAIT_TIME?: number | string;
  RTS_MAXWAIT_TIME_ACC?: number | string;
  RTS_MINWAIT_TIME?: number | string;
  RTS_MINWAIT_TIME_ACC?: number | string;
  RTS_AVGWAIT_TIME?: number | string;
  RTS_AVGWAIT_TIME_ACC?: number | string;
  /** 예상 대기시간 (EWT) */
  KPI_EWT_TIME?: number | string;
  /** 업무 로그인 상담사 수 */
  RTS_EXP_LOGIN_AGT?: number | string;

  // ─── 누적 — 인입 / 응대 / 포기 / 거부 / 실패 ─────────────────
  SUM_CONN_CNT?: number | string;
  SUM_OTHQ_INCNT?: number | string;
  SUM_OTHCEN_INCNT?: number | string;
  SUM_ANSWER_CNT?: number | string;
  /** SUM_ANSWER_CNT + SUM_EXTQ_ANSWER_CNT + SUM_NODE_ANSWER_CNT (BE 계산) */
  SUM_ANSWER_CNT_TOT?: number | string;
  SUM_EXTQ_ANSWER_CNT?: number | string;
  SUM_NODE_ANSWER_CNT?: number | string;
  SUM_ABDN_CNT?: number | string;
  SUM_DENY_CNT?: number | string;
  SUM_FAILED?: number | string;
  SUM_SLANSW_CNT?: number | string;
  SUM_SLABDN_CNT?: number | string;
  SUM_ABDTIME_ABANDON?: number | string;
  SUM_ABANDON_ICQ?: number | string;
  SUM_ABANDON_IVR?: number | string;
  SUM_ABANDON_AGT?: number | string;
  SUM_ABANDON_ETC?: number | string;

  // ─── 누적 — 시간 ──────────────────────────────────────────────
  SUM_ANSWER_TALKTIME?: number | string;
  SUM_ABANDON_WAITTIME?: number | string;
  AVG_TOTWAIT_TIME?: number | string;
  AVG_ANSWAIT_TIME?: number | string;
  AVG_ANSTALK_TIME?: number | string;
  AVG_ABDNWAIT_TIME?: number | string;
  MAX_ABDNWAIT_TIME?: number | string;
  RTS_WAITTIME_DAYTOT?: number | string;
  RTS_WAITTIME_DAYMAX?: number | string;
  RTS_ANSWER_WAITTOT?: number | string;
  RTS_ANSWER_WAITMAX?: number | string;

  // ─── 전환 (Transfer) ──────────────────────────────────────────
  SUM_OTHQ_OUTCNT?: number | string;
  SUM_OTHCEN_OUTCNT?: number | string;
  TOTAL_IN?: number | string;
  TOTAL_ANSWER?: number | string;
  TOTAL_ABANDON?: number | string;
  TOTAL_REJECT?: number | string;
  TOTAL_IVR_TRNS?: number | string;
  TOTAL_ICQ_TRNS?: number | string;
  TOTAL_DOD_TRNS?: number | string;
  TOTAL_FAILED?: number | string;
  TOTAL_DIST?: number | string;
  SUM_DIST?: number | string;
  AGT_DIST?: number | string;
  CONSULT_DIST?: number | string;

  // ─── 상담사 전환 ─────────────────────────────────────────────
  AGT_TRANS_IN?: number | string;
  AGT_TRANS_ANS?: number | string;
  AGT_TRANS_FAIL?: number | string;
  AGT_TRANS_REJECT?: number | string;
  AGT_TRANS_QABANDON?: number | string;
  AGT_TRANS_QABD_ABANDON?: number | string;
  AGT_TRANS_RING_ABANDON?: number | string;
  AGT_TRANS_RINGABD_ABANDON?: number | string;
  AGT_TRANS_QUE?: number | string;
  AGT_TRANS_IVR?: number | string;
  AGT_TRANS_NODE?: number | string;

  // ─── 협의 통화 ────────────────────────────────────────────────
  CONSULT_IN?: number | string;
  CONSULT_ANS?: number | string;
  CONSULT_REJECT?: number | string;
  CONSULT_FAIL?: number | string;
  CONSULT_QABANDON?: number | string;
  CONSULT_QABD_ABANDON?: number | string;
  CONSULT_RING_ABANDON?: number | string;
  CONSULT_RINGABD_ABANDON?: number | string;
  CONSULT_QUE?: number | string;
  CONSULT_IVR?: number | string;
  CONSULT_NODE?: number | string;

  // ─── KPI (BE 가 ÷100 정규화 — 표시 시 ×100) ──────────────────
  /** 응대율 (decimal 0~1, 표시는 ×100%) */
  KPI_ANSWER_RATE?: number | string;
  /** 서비스레벨 */
  KPI_SVCLEVEL?: number | string;
  /** 포기율 */
  KPI_ABANDON_RATIO?: number | string;
  /** 대기율 (RTS_WAIT_CNT / RTS_EXP_LOGIN_AGT) */
  KPI_WORKREADY_RATIO?: number | string;
  /** 오버콜 응대율 (EXTQ + NODE answer / CONN) */
  KPI_OVERCALL_ANSWER_RATIO?: number | string;

  // ─── 데이터 신선도 ────────────────────────────────────────────
  DB_UPDATE_SEC?: number | string;
  DB_UPDATE_TIME?: number | string;
  DI_UPDATE_TIME?: number | string;

  [extra: string]: unknown;
}

/** 큐 상태 분류 (FE 임계값 평가 결과) — 지표별 2단 임계의 최댓값. */
export type CtiqSeverity = 'ok' | 'warn' | 'danger';

/** 위젯 표시 밀도 — 큰카드(상세) / 작은카드(컴팩트) / 표(ag-Grid). */
export type CtiqDensity = 'large' | 'small' | 'grid';

/** 한 지표의 2단 임계 — 주의(warn)·위험(danger) 경계. */
export interface CtiqMetricThreshold {
  warn: number;
  danger: number;
}

/**
 * 임계값 — 사용자가 설정 드로어에서 조정 가능.
 * 각 지표를 자체 2단 임계로 등급화한 뒤 그중 가장 나쁜 등급을 큐 상태로 채택한다(worst-wins).
 */
export interface CtiqThresholds {
  /** 대기 콜수 — 초과할수록 나쁨 */
  waitCnt: CtiqMetricThreshold;
  /** 최장 대기 (초) — 초과할수록 나쁨 */
  maxWaitSec: CtiqMetricThreshold;
  /** SLA 목표 (%) — 미달할수록 나쁨 */
  slaPct: CtiqMetricThreshold;
  /** 포기율 (%) — 초과할수록 나쁨 */
  abandonRatioPct: CtiqMetricThreshold;
}

export const DEFAULT_CTIQ_THRESHOLDS: CtiqThresholds = {
  waitCnt: { warn: 10, danger: 25 },
  maxWaitSec: { warn: 60, danger: 180 },
  slaPct: { warn: 90, danger: 70 },
  abandonRatioPct: { warn: 5, danger: 10 },
};

/** 정렬 기준. */
export type CtiqSortBy = 'severity' | 'wait' | 'sla' | 'answerRate' | 'id';

/**
 * 영속화 UI 상태 — localStorage `bt-admin.insight.monitoring.widget.{widgetId}.ui` 에 저장.
 * AgentStatusWidget 와 같은 키 패턴.
 */
export interface CtiqUiState {
  density: CtiqDensity;
  activeSeverities: CtiqSeverity[];
  sortBy: CtiqSortBy;
  alertOnly: boolean;
  /** KPI Strip 접기 — 좌측 공간 확보용. */
  summaryCollapsed: boolean;
}
