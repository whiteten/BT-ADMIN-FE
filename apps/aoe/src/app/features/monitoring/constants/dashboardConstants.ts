/** AOE 모니터링 대시보드 — 시각 토큰(색상·그라데이션) */

/** 브랜드 기본색 (global.css의 --color-bt-primary와 동일) */
export const BRAND = '#085fb5';

/** 콜 상태 색상 — 진행중/완료/실패 (KPI·도넛·시계열 공통) */
export const STATUS_COLORS = {
  inbound: '#085fb5',
  inProgress: '#f59e0b',
  completed: '#10b981',
  failed: '#f06548',
} as const;

/** KPI 카드 악센트 — 지표 그룹별 강조색 */
export const KPI_ACCENTS = {
  primary: '#085fb5',
  amber: '#f59e0b',
  emerald: '#10b981',
  rose: '#f06548',
  violet: '#7c5cfc',
  slate: '#64748b',
} as const;

/**
 * LLM 모델 그라데이션 바 팔레트 (순환).
 * [시작색, 끝색] — 좌→우 가로 그라데이션.
 */
export const MODEL_GRADIENTS: readonly [string, string][] = [
  ['#085fb5', '#4f9bf0'],
  ['#7c5cfc', '#b39dfb'],
  ['#06b6d4', '#67e8f9'],
  ['#10b981', '#6ee7b7'],
  ['#f59e0b', '#fcd34d'],
  ['#ec4899', '#f9a8d4'],
] as const;

/** 도넛 세그먼트 색상 순서 (실시간 상태) */
export const DONUT_COLORS = [STATUS_COLORS.inProgress, STATUS_COLORS.completed, STATUS_COLORS.failed] as const;

/** LLM 사용 구성에서 개별 바로 표시할 최대 모델 수 (초과분은 '기타'로 합산) */
export const LLM_VISIBLE_MODELS = 3;

/** '기타' 묶음 바 그라데이션 (중립 슬레이트) */
export const OTHERS_GRADIENT: readonly [string, string] = ['#94a3b8', '#cbd5e1'];
