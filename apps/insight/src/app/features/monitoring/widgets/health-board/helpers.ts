import type { AgentDistribution, ChannelBoard, HealthBoardData, HealthBoardThresholds, Severity, TrunkBoard } from './types';

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

/**
 * BE 계약 severity 문자열 → FE Severity.
 * 'normal'은 'success'로 취급. 미지정/미상값은 'notice'(주의)로 폴백.
 */
function normalizeSeverity(v: unknown): Severity {
  const s = String(v ?? '').toLowerCase();
  switch (s) {
    case 'normal':
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    case 'notice':
    case 'warn': // 구 계약 호환
      return 'notice';
    default:
      return 'notice';
  }
}

/** 원본 DATA → 헬스보드 정규화 모델. */
export function toHealthData(data: unknown): HealthBoardData {
  const o = unwrap(data);
  // 상단 요약 카드(응대율·인입·응대)는 BE 가 summary 키로 묶어 내려준다.
  const summaryRaw = (o.summary ?? {}) as Record<string, unknown>;
  const agentsRaw = (o.agents ?? {}) as Record<string, unknown>;
  const alarmRaw = (summaryRaw.alarm ?? {}) as Record<string, unknown>;
  const qualityRaw = (o.quality ?? {}) as Record<string, unknown>;
  const distRaw = (qualityRaw.dist ?? {}) as Record<string, unknown>;

  return {
    answerRate: toPct(summaryRaw.answerRate),
    serviceLevel: toPct(summaryRaw.serviceLevel),
    abandonRate: toPct(summaryRaw.abandonRate),
    inboundCnt: num0(summaryRaw.inboundCnt),
    answeredCnt: num0(summaryRaw.answeredCnt),
    waitingCnt: num0(summaryRaw.waitingCnt),
    alarm: { minor: num0(alarmRaw.minor), major: num0(alarmRaw.major), critical: num0(alarmRaw.critical) },
    systems: Array.isArray(o.systems)
      ? (o.systems as Record<string, unknown>[]).map((s) => ({
          code: String(s.code ?? ''),
          name: String(s.name ?? s.code ?? ''),
          up: num0(s.up),
          total: num0(s.total),
          severity: normalizeSeverity(s.severity),
          processes: Array.isArray(s.processes)
            ? (s.processes as Record<string, unknown>[]).map((p) => ({
                name: String(p.name ?? ''),
                system: p.system != null ? String(p.system) : undefined,
                status: num0(p.status),
                severity: normalizeSeverity(p.severity),
                active: p.active != null ? num0(p.active) : undefined,
              }))
            : [],
        }))
      : [],
    queues: Array.isArray(o.queues)
      ? (o.queues as Record<string, unknown>[]).map((q, i) => ({
          id: String(q.id ?? i),
          name: String(q.name ?? ''),
          waitCnt: toNum(q.waitCnt) ?? undefined,
          serviceLevel: toNum(q.serviceLevel) ?? undefined,
          barPct: num0(q.barPct),
          sev: normalizeSeverity(q.sev),
        }))
      : [],
    agents: {
      logout: num0(agentsRaw.logout),
      aux: num0(agentsRaw.aux),
      ready: num0(agentsRaw.ready),
      talking: num0(agentsRaw.talking),
      ringing: num0(agentsRaw.ringing),
      dialing: num0(agentsRaw.dialing),
      hold: num0(agentsRaw.hold),
      wrapup: num0(agentsRaw.wrapup),
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
    trunks: toTrunkBoard(o.trunks),
    channels: toChannelBoard(o.channels),
    serverTs: toNum(o.serverTs) ?? undefined,
  };
}

/** 원본 channels(요약+목록) → 정규화 ChannelBoard. */
function toChannelBoard(raw: unknown): ChannelBoard {
  const t = (raw ?? {}) as Record<string, unknown>;
  const s = (t.summary ?? {}) as Record<string, unknown>;
  const items = Array.isArray(t.items)
    ? (t.items as Record<string, unknown>[]).map((it) => ({
        name: String(it.name ?? ''),
        systemId: num0(it.systemId),
        rate: num0(it.rate),
        busy: num0(it.busy),
        total: num0(it.total),
        inBusy: num0(it.inBusy),
        outBusy: num0(it.outBusy),
        severity: normalizeSeverity(it.severity),
      }))
    : [];
  return {
    summary: {
      rate: num0(s.rate),
      busy: num0(s.busy),
      total: num0(s.total),
      inBusy: num0(s.inBusy),
      outBusy: num0(s.outBusy),
      systemCnt: num0(s.systemCnt),
    },
    items,
  };
}

/** 원본 trunks(요약+목록) → 정규화 TrunkBoard. */
function toTrunkBoard(raw: unknown): TrunkBoard {
  const t = (raw ?? {}) as Record<string, unknown>;
  const s = (t.summary ?? {}) as Record<string, unknown>;
  const items = Array.isArray(t.items)
    ? (t.items as Record<string, unknown>[]).map((it) => ({
        kind: (it.kind === 'CO' ? 'CO' : 'SIP') as 'CO' | 'SIP',
        name: String(it.name ?? ''),
        rate: num0(it.rate),
        busyLine: num0(it.busyLine),
        totalLine: num0(it.totalLine),
        inBusy: num0(it.inBusy),
        outBusy: num0(it.outBusy),
        issueCnt: num0(it.issueCnt),
        severity: normalizeSeverity(it.severity),
      }))
    : [];
  return {
    summary: {
      rate: num0(s.rate),
      busyLine: num0(s.busyLine),
      totalLine: num0(s.totalLine),
      totalCnt: num0(s.totalCnt),
      blockCnt: num0(s.blockCnt),
      errorCnt: num0(s.errorCnt),
      normalCnt: num0(s.normalCnt),
    },
    items,
  };
}

// ─── 임계 판정 ─────────────────────────────────────────────────

const DEFAULTS: Required<HealthBoardThresholds> = {
  answerRate: { warn: 90, danger: 80 },
  serviceLevel: { warn: 90, danger: 80 },
  abandonRate: { warn: 3, danger: 5 },
  waiting: { warn: 9, danger: 29 },
};

/** 헬스보드 KPI 임계 기본값 — 설정 드로어 초기화/병합에 사용. (warn: 주의(주황) 경계, danger: 위험(빨강) 경계) */
export const DEFAULT_HB_THRESHOLDS: Required<HealthBoardThresholds> = DEFAULTS;

/** 높을수록 좋음: warn 이상 정상 / danger 이상 주의 / 미만 위험. (KPI 게이지는 notice/danger 2밴드) */
export function higherBetter(value: number | null, t: { warn: number; danger: number }): Severity {
  if (value == null) return 'notice';
  if (value >= t.warn) return 'success';
  if (value >= t.danger) return 'notice';
  return 'danger';
}

/** 낮을수록 좋음: warn 이하 정상 / danger 이하 주의 / 초과 위험. (KPI 게이지는 notice/danger 2밴드) */
export function lowerBetter(value: number | null, t: { warn: number; danger: number }): Severity {
  if (value == null) return 'notice';
  if (value <= t.warn) return 'success';
  if (value <= t.danger) return 'notice';
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

/** 종합 상태 — 위험(danger) > 경고(warning) > 주의(notice) > 정상(success). */
export function overallStatus(d: HealthBoardData): { sev: Severity; dangerCnt: number; warningCnt: number; noticeCnt: number } {
  const dangerCnt = d.alarm.critical;
  const warningCnt = d.alarm.major;
  const noticeCnt = d.alarm.minor;
  const worst = (a: Severity, b: Severity): Severity => (SEV_RANK[a] >= SEV_RANK[b] ? a : b);
  let sev: Severity = 'success';
  if (dangerCnt > 0) sev = 'danger';
  else if (warningCnt > 0) sev = 'warning';
  else if (noticeCnt > 0) sev = 'notice';
  // 시스템 심각도도 반영 (노드 severity 중 최악)
  for (const s of d.systems) sev = worst(sev, s.severity);
  return { sev, dangerCnt, warningCnt, noticeCnt };
}

// ─── 색상 토큰 매핑 ────────────────────────────────────────────

/** 심각도 정렬 순위 (높을수록 위험). */
const SEV_RANK: Record<Severity, number> = { success: 0, notice: 1, warning: 2, danger: 3 };

/** Severity → Tailwind/CSS 토큰. (insight @theme 의 --color-bt-* 사용) */
export const SEV_TEXT: Record<Severity, string> = {
  success: 'text-bt-success',
  notice: 'text-bt-notice',
  warning: 'text-bt-warning',
  danger: 'text-bt-danger',
};
export const SEV_BG: Record<Severity, string> = {
  success: 'bg-bt-success',
  notice: 'bg-bt-notice',
  warning: 'bg-bt-warning',
  danger: 'bg-bt-danger',
};
export const SEV_BG_SOFT: Record<Severity, string> = {
  success: 'bg-bt-success-soft',
  notice: 'bg-bt-notice-soft',
  warning: 'bg-bt-warning-soft',
  danger: 'bg-bt-danger-soft',
};
/** SVG stroke/fill 용 hex (presentation attribute 는 var() 미지원). insight @theme 토큰과 동일 값. */
export const SEV_HEX: Record<Severity, string> = {
  success: '#0a8a4a',
  notice: '#b7791f',
  warning: '#d9480f',
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

/**
 * 상담사 상태 색 (insight @theme --color-bt-st-* 와 동일 hex).
 * 표시 순서: 로그아웃 → 이석 → 대기 → 통화 → 벨울림 → 다이얼링 → 보류 → 후처리.
 * 벨울림·다이얼링은 테마상 동일 ring 토큰이라 도넛 구분을 위해 다이얼링만 밝은 변형색 사용.
 */
const AGENT_SEG_META: { key: keyof AgentDistribution; label: string; color: string }[] = [
  { key: 'logout', label: '로그아웃', color: '#cdd2d9' },
  { key: 'aux', label: '이석', color: '#85898f' },
  { key: 'ready', label: '대기', color: '#0a8a4a' },
  { key: 'talking', label: '통화', color: '#085fb5' },
  { key: 'ringing', label: '벨울림', color: '#b76e00' },
  { key: 'dialing', label: '다이얼링', color: '#d99a2b' },
  { key: 'hold', label: '보류', color: '#7a4e9e' },
  { key: 'wrapup', label: '후처리', color: '#9b7dff' },
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
