/**
 * 종합 헬스보드 위젯 — 정규화 데이터 모델.
 *
 * BE 집계 위젯(`computeFromRawData`)이 아직 없으므로, WebSocket DATA 프레임이
 * 어떤 형태로 와도 `helpers.toHealthData()` 가 본 타입으로 정규화한다.
 * 시안: docs/insight/monitoring/mvp-design/wireframes/01-healthboard.html
 */

/** 임계 상태 — 정상 / 주의 / 경고 / 위험. (success=정상, notice=주의, warning=경고, danger=위험) */
export type Severity = 'success' | 'notice' | 'warning' | 'danger';

/** 시스템 프로세스(클래스) 상태 — 칩 호버 팝오버에 표시. */
export interface SystemProcess {
  /** 프로세스(클래스) 표시명 — SYS_CLASS_NAME */
  name: string;
  /** 소속 시스템명 — SYSTEM_NAME */
  system?: string;
  /** 상태 코드 0:정상 1:주의 2:경고 3:위험 */
  status: number;
  /** 상태 심각도 — 'normal'은 FE 에서 'success'로 취급. */
  severity: Severity;
  /** 활성 여부 (1: 활성) */
  active?: number;
}

/** 시스템(도메인)별 프로세스 헬스. */
export interface SystemHealth {
  code: string; // IE / IC / IR
  name: string; // 표시명 (예: "IE 교환기")
  up: number; // 정상 프로세스 수
  total: number; // 전체 프로세스 수
  /** 시스템 심각도 — BE 계약(normal|notice|warning|danger). 'normal'은 FE 에서 'success'로 취급. */
  severity: Severity;
  /** 프로세스(클래스) 상세 리스트 — 칩 호버 팝오버용 */
  processes: SystemProcess[];
}

/** 큐 현황 항목 (위험순 Top-N). */
export interface QueueRow {
  id: string;
  name: string;
  /** 현재 대기콜 수 (있으면 표시) */
  waitCnt?: number;
  /** 서비스레벨 % (대기콜 대신 SL 위험을 보여줄 때) */
  serviceLevel?: number;
  /** 막대 채움 비율 0~100 (대기 압력 상대값) */
  barPct: number;
  sev: Severity;
}

/** 상담사 상태 분포 (8상태 — 상담사 상태 매트릭스와 동일 정의). */
export interface AgentDistribution {
  logout: number; // 로그아웃
  aux: number; // 이석
  ready: number; // 대기
  talking: number; // 통화
  ringing: number; // 벨울림
  dialing: number; // 다이얼링
  hold: number; // 보류
  wrapup: number; // 후처리
}

/** 통화 품질 (MoS). */
export interface QualityInfo {
  bad: number; // 나쁨 (<3.0) 자리 수
  warn: number; // 주의 (~3.5) 자리 수
  normal: number; // 정상 자리 수
  /** 등급 분포 비율 (합 100 권장) */
  dist: { good: number; fair: number; warn: number; bad: number };
  lowestMos?: number;
  lowestAgentName?: string;
  lowestAgentDn?: string;
}

/** 회선 1건 — 국선 GW 또는 SIP 트렁크(TRK_ID), 점유율 높은 순 Top-N. */
export interface TrunkInfo {
  /** 종류 — CO(국선 GW) | SIP(개별 트렁크) */
  kind: 'CO' | 'SIP';
  /** 표시명 — 국선: GW_NAME, SIP: TRK_NAME */
  name: string;
  /** 점유율 % = (IN_BUSY + OUT_BUSY) / 분모(LINE | TOT_LINE) × 100 */
  rate: number;
  /** 사용중 회선 (IN_BUSY + OUT_BUSY) */
  busyLine: number;
  /** 총 채널 */
  totalLine: number;
  /** 수신 점유 */
  inBusy: number;
  /** 발신 점유 */
  outBusy: number;
  /** 이상 여부 — 블록/미등록/에러 (국선은 GW 자체 상태, SIP 은 트렁크 상태) */
  issueCnt: number;
  severity: Severity;
}

/** 회선 전체 요약 (국선 + SIP 합산). */
export interface TrunkSummary {
  /** 전체 점유율 % */
  rate: number;
  busyLine: number;
  totalLine: number;
  /** 회선(국선 GW + SIP 트렁크) 총 수 */
  totalCnt: number;
  /** 블록 회선 수 */
  blockCnt: number;
  /** 에러/미등록 회선 수 */
  errorCnt: number;
  /** 정상 회선 수 */
  normalCnt: number;
}

/** 회선 보드 (요약 + Top-N 목록). */
export interface TrunkBoard {
  summary: TrunkSummary;
  items: TrunkInfo[];
}

/** 채널 현황 — IVR/SLEE 시스템 1건 (점유율 높은 순 Top-N). */
export interface ChannelInfo {
  /** 시스템 표시명 (SLEE {SYSTEM_ID}) */
  name: string;
  systemId: number;
  /** 점유율 % = 점유 / 전체 × 100 */
  rate: number;
  /** 점유 채널 (CHNL_STATUS != IDLE) */
  busy: number;
  /** 전체 채널 */
  total: number;
  /** 인바운드 점유 채널 */
  inBusy: number;
  /** 아웃바운드 점유 채널 */
  outBusy: number;
  severity: Severity;
}

/** 채널 현황 전체 요약. */
export interface ChannelSummary {
  rate: number;
  busy: number;
  total: number;
  inBusy: number;
  outBusy: number;
  /** 시스템(SLEE) 수 */
  systemCnt: number;
}

/** 채널 현황 보드 (요약 + Top-N 목록). */
export interface ChannelBoard {
  summary: ChannelSummary;
  items: ChannelInfo[];
}

/** 헬스보드 전체 정규화 데이터. */
export interface HealthBoardData {
  /** 응대율 % (0~100) */
  answerRate: number | null;
  /** 서비스레벨 % (0~100) */
  serviceLevel: number | null;
  /** 포기율 % (0~100, 낮을수록 좋음) */
  abandonRate: number | null;
  /** 금일 누적 인입 호수 */
  inboundCnt: number;
  /** 금일 누적 응대 호수 */
  answeredCnt: number;
  /** 현재 대기 호수 (전 큐 합계, 현재 스냅샷) */
  waitingCnt: number;
  /** 알람 건수 — ERR_LEVEL 1/2/3 = minor(주의)/major(경고)/critical(위험). DB·BE·FE 용어 일치. */
  alarm: { minor: number; major: number; critical: number };
  systems: SystemHealth[];
  queues: QueueRow[];
  agents: AgentDistribution;
  quality: QualityInfo;
  trunks: TrunkBoard;
  channels: ChannelBoard;
  /** 최종 갱신 시각 (ms) */
  serverTs?: number;
}

/** 위젯 옵션 — 임계값 오버라이드 (없으면 기본값 사용). warn=주의 경계, danger=위험 경계. */
export interface HealthBoardThresholds {
  /** 응대율·SL: warn 이상 정상 / danger 이상 주의 / 미만 위험 (higher-better) */
  answerRate?: { warn: number; danger: number };
  serviceLevel?: { warn: number; danger: number };
  /** 포기율·대기: warn 이하 정상 / danger 이하 주의 / 초과 위험 (lower-better) */
  abandonRate?: { warn: number; danger: number };
  waiting?: { warn: number; danger: number };
}
