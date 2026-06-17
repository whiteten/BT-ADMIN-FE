/** 타임트렌드 종합판 위젯 — BE `timeTrendWidget.computeFromRawData` 응답 타입. */

export interface TimeTrendPoint {
  /** 표시 라벨 (HH:mm / HH:00 / MM-DD). */
  time: string;
  /** 인입 콜 수 (해당 버킷). */
  inbound: number;
  /** 응대(처리) 콜 수. */
  answered: number;
  /** 못 받은 콜(미처리) = max(0, inbound - answered). */
  unhandled: number;
  /** 포기율 % = (TNT_1400+TNT_1450)/인입. */
  abandonRate: number;
  /** 서비스레벨 % = TNT_1140/인입. */
  sl: number;
  /** BE 판정 위험도. */
  severity: TimeTrendSeverity;
  /** 직전 버킷 대비 미처리 증감(골든타임 조기 경보용). */
  gapDelta: number;
}

export type TimeTrendSeverity = 'normal' | 'amber' | 'red';

export interface TimeTrendCurrent {
  /** 현재 인입 (콜/h, 최근 10분 버킷 ×6). */
  inbound: number;
  /** 현재 미처리 (콜). */
  unhandled: number;
  /** 현재 가용 상담사 (명, Redis 스냅샷 — 추세 없음). */
  available: number;
  /** 30분전 대비 인입 증감 % (없으면 null). */
  inboundDelta: number | null;
  /** 30분전 대비 미처리 증감 % (없으면 null). */
  unhandledDelta: number | null;
}

export interface TimeTrendPeak {
  /** 피크 시각 라벨 (없으면 null). */
  time: string | null;
  /** 피크 인입 (콜/h). */
  value: number;
}

export interface TimeTrendData {
  series: {
    min10: TimeTrendPoint[];
    hour: TimeTrendPoint[];
    day: TimeTrendPoint[];
  };
  current: TimeTrendCurrent;
  peak: TimeTrendPeak;
}
