import type { QualityDist, QualityItem, QualityRiskData } from './types';
import type { MosLevel } from '../agent-status/helpers';

/**
 * 순수 헬퍼 — 컴포넌트 의존 없음. 정규화 / 도넛 기하 계산.
 */

// ─── 형변환 ────────────────────────────────────────────────────

export function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function num0(v: unknown): number {
  return toNum(v) ?? 0;
}

/** 원본 data 가 객체/래핑 어느 형태로 와도 안전하게 객체 추출. */
function unwrap(data: unknown): Record<string, unknown> {
  if (data == null || typeof data !== 'object') return {};
  const obj = data as Record<string, unknown>;
  for (const key of ['value', 'rows', 'data']) {
    const inner = obj[key];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner as Record<string, unknown>;
  }
  return obj;
}

const MOS_LEVELS: MosLevel[] = ['good', 'normal', 'bad', 'verybad', 'unaccept', 'unavail'];

function toLevel(v: unknown): MosLevel {
  const s = String(v ?? '');
  return (MOS_LEVELS as string[]).includes(s) ? (s as MosLevel) : 'unavail';
}

/** 원본 DATA → 위험판 정규화 모델. */
export function toQualityData(data: unknown): QualityRiskData {
  const o = unwrap(data);
  const summaryRaw = (o.summary ?? {}) as Record<string, unknown>;
  const distRaw = (o.dist ?? {}) as Record<string, unknown>;

  return {
    summary: {
      avgMos: toNum(summaryRaw.avgMos),
      busyCnt: num0(summaryRaw.busyCnt),
      riskCnt: num0(summaryRaw.riskCnt),
      warnCnt: num0(summaryRaw.warnCnt),
      okCnt: num0(summaryRaw.okCnt),
    },
    dist: {
      good: num0(distRaw.good),
      normal: num0(distRaw.normal),
      bad: num0(distRaw.bad),
      verybad: num0(distRaw.verybad),
      unaccept: num0(distRaw.unaccept),
      unavail: num0(distRaw.unavail),
    },
    items: Array.isArray(o.items)
      ? (o.items as Record<string, unknown>[]).map((r) => ({
          dn: r.dn != null ? String(r.dn) : null,
          agentName: r.agentName != null ? String(r.agentName) : null,
          mos: toNum(r.mos),
          level: toLevel(r.level),
          dnStatus: toNum(r.dnStatus),
        }))
      : [],
  };
}

// ─── 도넛 기하 ─────────────────────────────────────────────────

export interface DonutArc {
  color: string;
  /** stroke-dasharray "len gap" */
  dash: string;
  /** stroke-dashoffset */
  offset: number;
}

/** 도넛 반지름 54 기준 둘레. */
export const DONUT_R = 54;
export const DONUT_C = 2 * Math.PI * DONUT_R;

/** 정상 자리 색 (insight bt-success). 범례·도넛 공유. */
export const OK_COLOR = '#0a8a4a';

/**
 * 위험/주의/정상 3-세그먼트 도넛 호 계산 (위험 빨강 → 주의 amber → 정상 초록 순).
 * 측정 0건이면 전체 회색 트랙만.
 */
export function donutArcs(risk: number, warn: number, ok: number): DonutArc[] {
  const total = risk + warn + ok;
  if (total <= 0) return [];
  const seg = (count: number, color: string, acc: number): DonutArc => {
    const len = (count / total) * DONUT_C;
    return { color, dash: `${len} ${DONUT_C - len}`, offset: -acc };
  };
  const arcs: DonutArc[] = [];
  let acc = 0;
  for (const [count, color] of [
    [risk, '#ef4444'],
    [warn, '#f59e0b'],
    [ok, OK_COLOR],
  ] as [number, string][]) {
    if (count > 0) {
      arcs.push(seg(count, color, acc));
      acc += (count / total) * DONUT_C;
    }
  }
  return arcs;
}

/** 통화상태 코드 → 라벨. */
export function dnStatusLabel(dnStatus: number | null): string {
  if (dnStatus === 1) return '수신';
  if (dnStatus === 2) return '발신';
  return '';
}

/** 검색 — 내선·상담사명 부분일치(대소문자 무시). */
export function matchItem(item: QualityItem, q: string): boolean {
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  const hay = [item.dn, item.agentName].map((v) => (v == null ? '' : String(v).toLowerCase())).join(' ');
  return hay.includes(needle);
}

/** 6단계 분포 막대 표시용 메타 (표시 순서 · BE dist 키). */
export const DIST_ROWS: { key: keyof QualityDist; level: MosLevel }[] = [
  { key: 'good', level: 'good' },
  { key: 'normal', level: 'normal' },
  { key: 'bad', level: 'bad' },
  { key: 'verybad', level: 'verybad' },
  { key: 'unaccept', level: 'unaccept' },
  { key: 'unavail', level: 'unavail' },
];

/** 위험·주의 등급(나쁨 이하) — alertOnly 필터용. */
const ALERT_LEVELS: MosLevel[] = ['bad', 'verybad', 'unaccept'];

export function isAlertLevel(level: MosLevel): boolean {
  return ALERT_LEVELS.includes(level);
}
