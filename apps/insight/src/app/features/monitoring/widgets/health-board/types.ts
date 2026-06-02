/**
 * 종합 헬스보드 위젯 — 정규화 데이터 모델.
 *
 * BE 집계 위젯(`computeFromRawData`)이 아직 없으므로, WebSocket DATA 프레임이
 * 어떤 형태로 와도 `helpers.toHealthData()` 가 본 타입으로 정규화한다.
 * 시안: docs/insight/monitoring/mvp-design/wireframes/01-healthboard.html
 */

/** 임계 상태 — 정상 / 주의 / 위험. */
export type Severity = 'success' | 'warn' | 'danger';

/** 시스템(도메인)별 노드 헬스. */
export interface SystemHealth {
  code: string; // IE / IC / IR
  name: string; // 표시명 (예: "IE 교환기")
  up: number; // 정상 노드 수
  total: number; // 전체 노드 수
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

/** 상담사 상태 분포 (5상태). */
export interface AgentDistribution {
  available: number; // 가용
  talking: number; // 통화
  wrapup: number; // 후처리
  aux: number; // 이석
  offline: number; // 오프라인
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
  /** 알람 건수 */
  alarm: { danger: number; warn: number };
  systems: SystemHealth[];
  queues: QueueRow[];
  /** 정상(비위험) 큐 개수 — 접힘 토글 라벨용 */
  normalQueueCnt: number;
  agents: AgentDistribution;
  quality: QualityInfo;
  /** 최종 갱신 시각 (ms) */
  serverTs?: number;
}

/** 위젯 옵션 — 임계값 오버라이드 (없으면 기본값 사용). */
export interface HealthBoardThresholds {
  /** 응대율·SL: 이상이면 정상 / 이상이면 주의 / 미만 위험 (higher-better) */
  answerRate?: { good: number; warn: number };
  serviceLevel?: { good: number; warn: number };
  /** 포기율·대기: 이하면 정상 / 이하면 주의 / 초과 위험 (lower-better) */
  abandonRate?: { good: number; warn: number };
  waiting?: { good: number; warn: number };
}
