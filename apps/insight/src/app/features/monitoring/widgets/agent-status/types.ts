/**
 * BE INSIGHT AgentStatusWidget(`widgetType = "agent-status-matrix"`) 응답 row 타입.
 *
 * 레거시 SWAT `agentStatus.jsp` 의 alasql SELECT 출력과 1:1 매핑.
 * BE 는 Redis `MON:AGENT_STATUS` 의 IC_AGENT row 를 그대로 직렬화하므로
 * 모든 필드는 선택적이며 (Redis 부분 데이터 가능) 숫자 필드도 문자열로 전달될 수 있다.
 */
export interface AgentRow {
  // ─── 식별 ─────────────────────────────────────────────────────
  AGENT_ID?: number | string;
  AGENT_NAME?: string;
  AGENT_LOGIN_ID?: string;
  LOGIN_DN_NO?: string | number;
  NODE_ID?: number | string;
  TENANT_ID?: number | string;
  TNT_ID?: number | string;

  // ─── 조직 / 카테고리 ─────────────────────────────────────────
  CENTER_ID?: number | string;
  CENTER_NAME?: string;
  GROUP_ID?: number | string;
  GROUP_NAME?: string;
  /** 지정상담사 카테고리: 0(미지정) / 10·20·30·40·50(사용자 정의 1~5) */
  CATEGORY_TYPE?: number | string;
  IS_FAVOR?: number | string;

  // ─── 미디어 / 로그인 ──────────────────────────────────────────
  MEDIA_TYPE?: number | string;
  LOGIN_TIME?: number | string;
  LOGOUT_TIME?: number | string;
  LOGIN_STATUS?: number | string;

  // ─── 현재 상태 ────────────────────────────────────────────────
  /** 10:로그아웃 20:로그인 30:이석 40·41·42:대기 50:통화 51:벨울림 52:다이얼링 53:보류 60:후처리 */
  AGENT_STATUS?: number | string;
  /** 50+10=IB / 50+20=OB. 30·60 에서는 이석·후처리 사유코드 */
  REASON_CODE?: number | string;
  /** "XXXX10XX" 처럼 substring(4,2)=="10" 이면 전환 호 진행 중 */
  AGENT_BUSY_STATUS?: number | string;
  /** Redis 저장 시점 (epoch 초 또는 ms, yyyyMMddHHmmss 문자열) */
  STATUS_TIME?: number | string;
  /** 서버 측 계산 상태 유지 시간 (초). 클라이언트는 STATUS_TIME 기반 실시간 재계산. */
  STATUS_DURATION?: number | string;

  // ─── 현재 통화 컨텍스트 (AGENT_STATUS=50/51/52/53) ────────────
  /** 현재 통화중인 ANI (50 통화 시에만 채워짐) */
  FINAL_TALK_ANI?: string;
  FINAL_TALK_UCID?: string;
  /** 마지막 인입 큐 (라우팅) */
  LAST_ICQ_ID?: number | string;
  LAST_ICQ_NAME?: string;
  /** 마지막 적용 스킬 */
  LAST_SKILL_ID?: number | string;
  LAST_SKILL_NAME?: string;
  /** 현재 멀티미디어 동시 통화 수 (음성+채팅 등) */
  CURR_MEDIA_CALL_CNT?: number | string;

  // ─── 데이터 신선도 ────────────────────────────────────────────
  /** 마지막 DB 갱신 후 경과 초 — Redis lag 표시용 */
  DB_UPDATE_SEC?: number | string;
  DB_UPDATE_TIME?: number | string;
  DI_UPDATE_TIME?: number | string;

  // ─── EXTDN 조인 결과 (BE 가 IE:EXTDN:* 스캔 후 LOGIN_DN_NO 매칭으로 주입) ─
  /**
   * MOS (Mean Opinion Score) — 통화 품질 지표.
   * BE 는 상담사 상태가 로그아웃(10) 이 아닌 경우에만 매칭된 EXTDN row 의 MOS 를 주입.
   * `-1` 은 미측정. 로그아웃 상태이면 필드 자체가 없음.
   */
  MOS?: number;

  // ─── IC:AGENTDC:* / IC:AGENTDT:* 조인 결과 ────────────────────
  /** 이석 횟수 — CNT_0~15 합 (BE 가 복합키 AGENT_ID:GROUP_ID:MEDIA_TYPE 매칭으로 주입). */
  AUX_CNT?: number;
  /** 이석 시간 (초) — TIME_0~15 합. */
  AUX_TIME?: number;

  // ─── BE 파생값 ────────────────────────────────────────────────
  /**
   * 자율처리율 (%) — `(1 - SUM_TRNS_OUT / SUM_ANSW_CNT) × 100`.
   * 응답수 0 이면 100. BE 가 raw 누적값에서 계산해서 주입.
   */
  SELF_HANDLE_RATE?: number;

  // ─── 누적 카운트 (오늘 자정 ~ 현재) ──────────────────────────
  /** IB 인입 */
  SUM_CONN_CNT?: number | string;
  /** IB 응답 */
  SUM_ANSW_CNT?: number | string;
  /** IB 포기 */
  SUM_ABDN_CNT?: number | string;
  /** IB 거부 */
  SUM_DENY_CNT?: number | string;
  /** IB 실패 */
  SUM_IN_FAILED?: number | string;
  /** IB SL 응답 */
  SUM_SLANSW_CNT?: number | string;
  /** OB 시도 */
  SUM_OB_TRY?: number | string;
  /** OB 성공 */
  SUM_OB_SUCC?: number | string;
  /** 호전환 발신 (응대 전/후 합) */
  SUM_TRNS_OUT?: number | string;
  SUM_RING_TRNS_OUT?: number | string;
  SUM_TALK_TRNS_OUT?: number | string;
  /** 이석 횟수 */
  SUM_NOTREADY_CNT?: number | string;
  /** 후처리 횟수 */
  SUM_ACW_CNT?: number | string;

  // ─── 누적 시간 (초) ───────────────────────────────────────────
  SUM_IB_TALKTIME?: number | string;
  SUM_OB_TALKTIME?: number | string;
  SUM_HOLD_TIME?: number | string;
  SUM_ACW_TIME?: number | string;
  SUM_NOTREADY_TIME?: number | string;
  SUM_READY_TIME?: number | string;

  // ─── KPI ──────────────────────────────────────────────────────
  /** 응대율 % (소수: 0~100) */
  KPI_ANSWER_RATE?: number | string;
  KPI_ANSWER_RATE2?: number | string;
  /** SL % */
  KPI_SVCLEVEL?: number | string;
  KPI_SVCLEVEL2?: number | string;
  /** 인입 평균 대기시간 (초) */
  AVG_TOTWAIT_TIME?: number | string;
  /** 응답 평균 통화시간 (초) */
  AVG_ANSTALK_TIME?: number | string;

  [extra: string]: unknown;
}

/** 시맨틱 그룹 — 12종 코드를 5종으로 압축 (시안 §1). */
export type StatusGroup = 'available' | 'talking' | 'ringing' | 'wrapup' | 'offline';

/** 상태별 컬러 시맨틱 (CSS 토큰 매핑 키). */
export type StatusColor = 'idle' | 'talk' | 'ring' | 'hold' | 'wrap' | 'aux' | 'offline' | 'alert';

/** 알람 단계 — 임계값 평가 결과. */
export type AlarmLevel = 0 | 1 | 2; // 0: 정상, 1: notice(주의), 2: alarm(임계초과)

/** 위젯 표시 밀도 — 카드(상세) / 행(목록) / 도트(200+ 한 화면) / 그리드(ag-Grid 표) */
export type Density = 'card' | 'row' | 'dot' | 'grid';

/** 그룹화 기준. */
export type GroupBy = 'queue' | 'state' | 'category' | 'none';

/** 정렬 기준. */
export type SortBy = 'duration' | 'name' | 'state' | 'answered' | 'rate';

/** 상태별 임계값 (초). statusMap.DEFAULT_THRESHOLDS 와 호환. warn=주의 경계, danger=위험 경계. */
export interface Threshold {
  /** 주의 (노란 강조) 경계 — 초 단위 */
  warn: number;
  /** 위험 (빨간 강조) 경계 — 초 단위 */
  danger: number;
}
