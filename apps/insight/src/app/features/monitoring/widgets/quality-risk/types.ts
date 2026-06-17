import type { MosLevel } from '../agent-status/helpers';

/**
 * 통화 품질 위험판 위젯 — BE `QualityRiskWidget.computeFromRawData` 응답 모델.
 */

/** 평균 MoS 도넛 요약. */
export interface QualitySummary {
  /** 통화중 측정값 평균 MoS (미사용 제외). 측정 0건이면 null. */
  avgMos: number | null;
  /** 통화중 내선 수. */
  busyCnt: number;
  /** 위험(매우나쁨·허용불가) 수. */
  riskCnt: number;
  /** 주의(나쁨) 수. */
  warnCnt: number;
  /** 정상(좋음·보통·미사용) 수. */
  okCnt: number;
}

/** MoS 6단계 분포. */
export interface QualityDist {
  good: number;
  normal: number;
  bad: number;
  verybad: number;
  unaccept: number;
  unavail: number;
}

/** 나쁜 자리 Top-N 항목. */
export interface QualityItem {
  /** 내선번호. */
  dn: string | null;
  /** 조인된 상담사명. 미로그인이면 null. */
  agentName: string | null;
  /** MoS 값. */
  mos: number | null;
  /** MoS 등급. */
  level: MosLevel;
  /** 통화상태 1:수신 2:발신. */
  dnStatus: number | null;
}

export interface QualityRiskData {
  summary: QualitySummary;
  dist: QualityDist;
  items: QualityItem[];
}
