/**
 * 인사이트 모니터링 — 상수
 */

import type { DomainCode, KpiDirection, VizType } from '../types';

// ─── 도메인 ──────────────────────────────────────────────────────────────

export const DOMAIN_LABELS: Record<DomainCode, string> = {
  IE: 'PBX',
  IC: 'CTI',
  IR: 'IVR',
};

export const DOMAIN_COLOR_CLASS: Record<DomainCode, string> = {
  IE: 'bg-[var(--color-bt-primary)] text-white',
  IC: 'bg-[var(--color-bt-success)] text-white',
  IR: 'bg-[var(--color-bt-warn)] text-white',
};

// 도메인 색상만 (배경 점, 좌측 액센트 바 등에 사용)
export const DOMAIN_DOT_CLASS: Record<DomainCode, string> = {
  IE: 'bg-[var(--color-bt-primary)]',
  IC: 'bg-[var(--color-bt-success)]',
  IR: 'bg-[var(--color-bt-warn)]',
};

export const DOMAIN_OPTIONS: Array<{ value: DomainCode; label: string }> = [
  { value: 'IE', label: 'IE · 교환기' },
  { value: 'IC', label: 'IC · CTI' },
  { value: 'IR', label: 'IR · IVR' },
];

// ─── 시각화 ──────────────────────────────────────────────────────────────

export const VIZ_LABELS: Record<VizType, string> = {
  GRID: '그리드',
  BAR: '막대',
  LINE: '선',
  CARD: '카드',
};

export const VIZ_ICON: Record<VizType, string> = {
  GRID: '▦',
  BAR: '▮',
  LINE: '╱',
  CARD: '▢',
};

// ─── KPI 방향 ───────────────────────────────────────────────────────────

export const KPI_DIRECTION_LABELS: Record<KpiDirection, string> = {
  HIGHER_BETTER: '높을수록 좋음 ↑',
  LOWER_BETTER: '낮을수록 좋음 ↓',
  NEUTRAL: '중립',
};

export const KPI_DIRECTION_BADGE: Record<KpiDirection, { label: string; className: string }> = {
  HIGHER_BETTER: { label: '↑ HIGHER', className: 'bg-[var(--color-bt-success-soft)] text-[var(--color-bt-success)]' },
  LOWER_BETTER: { label: '↓ LOWER', className: 'bg-[var(--color-bt-warn-soft)] text-[var(--color-bt-warn)]' },
  NEUTRAL: { label: '○ NEUTRAL', className: 'bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg-muted)]' },
};

// ─── 갱신 간격 ──────────────────────────────────────────────────────────

export const REFRESH_THROTTLE_OPTIONS: Array<{ value: 1 | 3 | 5 | 10 | 'PAUSED'; label: string }> = [
  { value: 1, label: '1초' },
  { value: 3, label: '3초' },
  { value: 5, label: '5초' },
  { value: 10, label: '10초' },
  { value: 'PAUSED', label: '일시정지' },
];

// ─── 캐시 TTL 단위 ──────────────────────────────────────────────────────

export const CACHE_TTL_UNITS: Array<{ value: 'sec' | 'min' | 'hour'; label: string; multiplier: number }> = [
  { value: 'sec', label: '초', multiplier: 1 },
  { value: 'min', label: '분', multiplier: 60 },
  { value: 'hour', label: '시', multiplier: 3600 },
];

// ─── 룩업 미스 처리 ────────────────────────────────────────────────────

export const LOOKUP_MISS_POLICY_OPTIONS = [
  { value: 'PASSTHROUGH' as const, label: '코드 그대로 노출' },
  { value: 'EMPTY' as const, label: '빈 문자열' },
  { value: 'UNKNOWN' as const, label: "'(알 수 없음)'" },
];

// ─── 컬럼 서식 ──────────────────────────────────────────────────────────

export const COLUMN_FORMAT_OPTIONS = [
  { value: 'Number' as const, label: 'Number (정수)' },
  { value: 'Decimal' as const, label: 'Decimal (소수)' },
  { value: 'Rate' as const, label: 'Rate (%)' },
  { value: 'String' as const, label: 'String (문자)' },
  { value: 'Date' as const, label: 'Date (날짜)' },
  { value: 'Time' as const, label: 'Time (시간)' },
];
