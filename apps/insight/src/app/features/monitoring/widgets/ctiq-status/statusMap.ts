import type { CtiqSeverity } from './types';

/**
 * 큐 상태(Severity) 시각 메타 — Tailwind 클래스 + hex.
 *
 * AgentStatusWidget 의 statusMap 패턴 동일 — 색상은 모두 토큰화하여 한 곳에 집중.
 * 카드·칩·KPI 타일·그리드 셀이 같은 색을 공유.
 */
export interface SeverityMeta {
  label: string;
  /** 칩 active 상태 (배경+글자+보더) */
  chipCls: string;
  /** dot 배경 (작은 원) */
  dotCls: string;
  /** 카드 행 hover/배경 */
  rowBg: string;
  /** 카드 좌측 3px 보더 */
  barCls: string;
  /** 카드 외곽 보더 (severity 강조) */
  cardBorder: string;
  /** 강조 텍스트 (대기수·최장대기 등 시각 hit) */
  textCls: string;
  /** ag-Grid Tag 색상 (antd Tag color prop) */
  tagColor: string;
  /** raw hex (외부 차트·필요 시) */
  hex: string;
}

export const SEVERITY_META: Record<CtiqSeverity, SeverityMeta> = {
  danger: {
    label: '위험',
    chipCls: 'bg-red-50 text-red-700 border-red-200',
    dotCls: 'bg-red-600',
    rowBg: 'bg-red-50/60',
    barCls: 'bg-red-600',
    cardBorder: 'border-red-500 shadow-[0_0_0_1px_rgba(201,42,42,0.4)]',
    textCls: 'text-red-600',
    tagColor: 'red',
    hex: '#dc2626',
  },
  warn: {
    label: '주의',
    chipCls: 'bg-amber-50 text-amber-700 border-amber-200',
    dotCls: 'bg-amber-500',
    rowBg: 'bg-amber-50/40',
    barCls: 'bg-amber-500',
    cardBorder: 'border-gray-200',
    textCls: 'text-amber-600',
    tagColor: 'gold',
    hex: '#f59e0b',
  },
  ok: {
    label: '정상',
    chipCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotCls: 'bg-emerald-600',
    rowBg: '',
    barCls: 'bg-emerald-600',
    cardBorder: 'border-gray-200',
    textCls: 'text-gray-900',
    tagColor: 'green',
    hex: '#059669',
  },
};

/**
 * 칩·정렬·필터에서 사용하는 표시 순서 (위험 → 정상).
 * 정렬 가중치는 helpers.ts의 severityWeight()와 동일 의미.
 */
export const SEVERITY_ORDER: CtiqSeverity[] = ['danger', 'warn', 'ok'];
