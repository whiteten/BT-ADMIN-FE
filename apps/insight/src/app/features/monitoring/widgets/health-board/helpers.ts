import type { AgentDistribution, HealthBoardData, HealthBoardThresholds, Severity } from './types';

/**
 * 순수 헬퍼 — 컴포넌트 의존 없음.
 * 정규화 / 임계 판정 / 반원 게이지·도넛 기하 계산.
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

/**
 * 원본 data 가 객체/래핑 어느 형태로 와도 안전하게 객체 추출.
 * Aggregation 엔진의 `{value: {...}}` / `{rows: {...}}` 래핑도 처리.
 */
function unwrap(data: unknown): Record<string, unknown> {
  if (data == null || typeof data !== 'object') return {};
  const obj = data as Record<string, unknown>;
  for (const key of ['value', 'rows', 'data']) {
    const inner = obj[key];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner as Record<string, unknown>;
  }
  return obj;
}

/** % 정규화 — 0~1 비율이면 ×100, 이미 0~100 이면 그대로. */
function toPct(v: unknown): number | null {
  const n = toNum(v);
  if (n == null) return null;
  return n > 0 && n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

/** 원본 DATA → 헬스보드 정규화 모델. */
export function toHealthData(data: unknown): HealthBoardData {
  const o = unwrap(data);
  const agentsRaw = (o.agents ?? {}) as Record<string, unknown>;
  const alarmRaw = (o.alarm ?? {}) as Record<string, unknown>;
  const qualityRaw = (o.quality ?? {}) as Record<string, unknown>;
  const distRaw = (qualityRaw.dist ?? {}) as Record<string, unknown>;

  return {
    answerRate: toPct(o.answerRate),
    serviceLevel: toPct(o.serviceLevel),
    abandonRate: toPct(o.abandonRate),
    inboundCnt: num0(o.inboundCnt),
    answeredCnt: num0(o.answeredCnt),
    waitingCnt: num0(o.waitingCnt),
    alarm: { danger: num0(alarmRaw.danger), warn: num0(alarmRaw.warn) },
    systems: Array.isArray(o.systems)
      ? (o.systems as Record<string, unknown>[]).map((s) => ({
          code: String(s.code ?? ''),
          name: String(s.name ?? s.code ?? ''),
          up: num0(s.up),
          total: num0(s.total),
        }))
      : [],
    queues: Array.isArray(o.queues)
      ? (o.queues as Record<string, unknown>[]).map((q, i) => ({
          id: String(q.id ?? i),
          name: String(q.name ?? ''),
          waitCnt: toNum(q.waitCnt) ?? undefined,
          serviceLevel: toNum(q.serviceLevel) ?? undefined,
          barPct: num0(q.barPct),
          sev: (q.sev as Severity) ?? 'warn',
        }))
      : [],
    normalQueueCnt: num0(o.normalQueueCnt),
    agents: {
      available: num0(agentsRaw.available),
      talking: num0(agentsRaw.talking),
      wrapup: num0(agentsRaw.wrapup),
      aux: num0(agentsRaw.aux),
      offline: num0(agentsRaw.offline),
    },
    quality: {
      bad: num0(qualityRaw.bad),
      warn: num0(qualityRaw.warn),
      normal: num0(qualityRaw.normal),
      dist: {
        good: num0(distRaw.good),
        fair: num0(distRaw.fair),
        warn: num0(distRaw.warn),
        bad: num0(distRaw.bad),
      },
      lowestMos: toNum(qualityRaw.lowestMos) ?? undefined,
      lowestAgentName: qualityRaw.lowestAgentName ? String(qualityRaw.lowestAgentName) : undefined,
      lowestAgentDn: qualityRaw.lowestAgentDn ? String(qualityRaw.lowestAgentDn) : undefined,
    },
    serverTs: toNum(o.serverTs) ?? undefined,
  };
}

// ─── 임계 판정 ─────────────────────────────────────────────────

const DEFAULTS: Required<HealthBoardThresholds> = {
  answerRate: { good: 90, warn: 80 },
  serviceLevel: { good: 90, warn: 80 },
  abandonRate: { good: 3, warn: 5 },
  waiting: { good: 9, warn: 29 },
};

/** 높을수록 좋음: good 이상 정상 / warn 이상 주의 / 미만 위험. */
export function higherBetter(value: number | null, t: { good: number; warn: number }): Severity {
  if (value == null) return 'warn';
  if (value >= t.good) return 'success';
  if (value >= t.warn) return 'warn';
  return 'danger';
}

/** 낮을수록 좋음: good 이하 정상 / warn 이하 주의 / 초과 위험. */
export function lowerBetter(value: number | null, t: { good: number; warn: number }): Severity {
  if (value == null) return 'warn';
  if (value <= t.good) return 'success';
  if (value <= t.warn) return 'warn';
  return 'danger';
}

export function answerRateSev(d: HealthBoardData, t?: HealthBoardThresholds): Severity {
  return higherBetter(d.answerRate, t?.answerRate ?? DEFAULTS.answerRate);
}
export function serviceLevelSev(d: HealthBoardData, t?: HealthBoardThresholds): Severity {
  return higherBetter(d.serviceLevel, t?.serviceLevel ?? DEFAULTS.serviceLevel);
}
export function abandonSev(d: HealthBoardData, t?: HealthBoardThresholds): Severity {
  return lowerBetter(d.abandonRate, t?.abandonRate ?? DEFAULTS.abandonRate);
}
export function waitingSev(d: HealthBoardData, t?: HealthBoardThresholds): Severity {
  return lowerBetter(d.waitingCnt, t?.waiting ?? DEFAULTS.waiting);
}

/** 종합 상태 — 위험 요소(알람/노드다운)가 있으면 danger, 주의면 warn, 아니면 success. */
export function overallStatus(d: HealthBoardData): { sev: Severity; dangerCnt: number; warnCnt: number } {
  const nodeDown = d.systems.some((s) => s.up < s.total);
  const dangerCnt = d.alarm.danger;
  const warnCnt = d.alarm.warn;
  let sev: Severity = 'success';
  if (dangerCnt > 0 || nodeDown) sev = 'danger';
  else if (warnCnt > 0) sev = 'warn';
  return { sev, dangerCnt, warnCnt };
}

// ─── 색상 토큰 매핑 ────────────────────────────────────────────

/** Severity → Tailwind/CSS 토큰. (insight @theme 의 --color-bt-* 사용) */
export const SEV_TEXT: Record<Severity, string> = {
  success: 'text-bt-success',
  warn: 'text-bt-warn',
  danger: 'text-bt-danger',
};
export const SEV_BG: Record<Severity, string> = {
  success: 'bg-bt-success',
  warn: 'bg-bt-warn',
  danger: 'bg-bt-danger',
};
export const SEV_BG_SOFT: Record<Severity, string> = {
  success: 'bg-bt-success-soft',
  warn: 'bg-bt-warn-soft',
  danger: 'bg-bt-danger-soft',
};
/** SVG stroke/fill 용 hex (presentation attribute 는 var() 미지원). insight @theme 토큰과 동일 값. */
export const SEV_HEX: Record<Severity, string> = {
  success: '#0a8a4a',
  warn: '#b76e00',
  danger: '#c92a2a',
};

// ─── 반원 게이지 기하 (viewBox 0 0 160 92, center 80,80 r 64) ────

/** fraction(0~1) 위치의 게이지 호 path. */
export function gaugeArc(fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  if (f <= 0) return 'M16 80 A64 64 0 0 1 16 80';
  const theta = Math.PI * (1 - f);
  const x = 80 + 64 * Math.cos(theta);
  const y = 80 - 64 * Math.sin(theta);
  return `M16 80 A64 64 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

/** fraction 위치의 목표 마커 틱 (게이지 밴드를 가로지르는 짧은 선). */
export function gaugeTick(fraction: number): { x1: number; y1: number; x2: number; y2: number } {
  const f = Math.max(0, Math.min(1, fraction));
  const theta = Math.PI * (1 - f);
  const inner = 56;
  const outer = 72;
  return {
    x1: 80 + inner * Math.cos(theta),
    y1: 80 - inner * Math.sin(theta),
    x2: 80 + outer * Math.cos(theta),
    y2: 80 - outer * Math.sin(theta),
  };
}

// ─── 도넛 세그먼트 (r 44) ──────────────────────────────────────

export const DONUT_CIRC = 2 * Math.PI * 44; // ≈ 276.46

export interface DonutSeg {
  key: keyof AgentDistribution;
  label: string;
  /** stroke 색 (CSS 변수 또는 hex) */
  color: string;
  /** 범례 배경 클래스 또는 inline style 용 색 */
  value: number;
  dasharray: string;
  dashoffset: number;
}

/** 상담사 상태 색 (insight @theme --color-bt-st-* 와 동일 hex). */
const AGENT_SEG_META: { key: keyof AgentDistribution; label: string; color: string }[] = [
  { key: 'available', label: '가용', color: '#0a8a4a' },
  { key: 'talking', label: '통화', color: '#085fb5' },
  { key: 'wrapup', label: '후처리', color: '#9b7dff' },
  { key: 'aux', label: '이석', color: '#85898f' },
  { key: 'offline', label: '오프라인', color: '#cdd2d9' },
];

/** 상담사 분포 → 도넛 세그먼트 배열 (누적 offset 계산). */
export function agentDonutSegments(agents: AgentDistribution): { segments: DonutSeg[]; total: number } {
  const total = AGENT_SEG_META.reduce((sum, m) => sum + (agents[m.key] ?? 0), 0);
  let acc = 0;
  const segments: DonutSeg[] = AGENT_SEG_META.map((m) => {
    const value = agents[m.key] ?? 0;
    const len = total > 0 ? (value / total) * DONUT_CIRC : 0;
    const seg: DonutSeg = {
      key: m.key,
      label: m.label,
      color: m.color,
      value,
      dasharray: `${len.toFixed(2)} ${(DONUT_CIRC - len).toFixed(2)}`,
      dashoffset: -acc,
    };
    acc += len;
    return seg;
  });
  return { segments, total };
}
