import type { CtiqMetricThreshold, CtiqRow, CtiqSeverity, CtiqThresholds } from './types';

/** 안전 숫자 변환. 문자열 숫자도 처리. */
export function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

export function toStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

/** 원본 data 가 List / {rows} / {value} / {items} 어느 형태든 안전 추출. */
export function toCtiqRows(data: unknown): CtiqRow[] {
  if (data == null) return [];
  let list: unknown = data;
  if (!Array.isArray(list) && typeof list === 'object') {
    const obj = list as Record<string, unknown>;
    if (Array.isArray(obj.rows)) list = obj.rows;
    else if (Array.isArray(obj.value)) list = obj.value;
    else if (Array.isArray(obj.items)) list = obj.items;
  }
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is CtiqRow => r != null && typeof r === 'object');
}

/** 초 → "mm:ss" 또는 "h:mm:ss". 0/null/'-' 은 '—'. */
export function fmtDuration(v: unknown): string {
  const n = toNum(v);
  if (n == null || n <= 0) return '—';
  const s = Math.floor(n);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/** KPI(decimal 0~1)을 "95.5%" 형태로 표시. */
export function fmtPct(v: unknown, digits = 1): string {
  const n = toNum(v);
  if (n == null) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

/** 원본 정수 표기 (1,234). null/0 처리. */
export function fmtCount(v: unknown): string {
  const n = toNum(v);
  if (n == null) return '—';
  return n.toLocaleString();
}

// ─── KPI 계산 (raw 호수 컬럼 기반, 0~1 비율 반환) ──────────────────────────
// BE 가 내려주는 precomputed KPI_*(KPI_ANSWER_RATE/KPI_SVCLEVEL/KPI_ABANDON_RATIO)는
// 값이 0/미신뢰. raw 호수 컬럼이 실값이라 이걸로 직접 계산한다.
// (원본 SQL: ROUND(SUM(분자)*100/SUM(SUM_CONN_CNT),2), conn 0 → 0)

/** 응대율 = (인입큐응답 + 타큐전환응답 + 타센터전환응답) / 신규인입호 */
export function answerRateOf(row: CtiqRow): number {
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  if (conn === 0) return 0;
  const answered = (toNum(row.SUM_ANSWER_CNT) ?? 0) + (toNum(row.SUM_EXTQ_ANSWER_CNT) ?? 0) + (toNum(row.SUM_NODE_ANSWER_CNT) ?? 0);
  return answered / conn;
}

/** 포기율 = 포기호 / 신규인입호 */
export function abandonRateOf(row: CtiqRow): number {
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  if (conn === 0) return 0;
  return (toNum(row.SUM_ABDN_CNT) ?? 0) / conn;
}

/** 서비스레벨(SLA) = (서비스레벨내 응답 + 서비스레벨내 포기) / 신규인입호 */
export function serviceLevelOf(row: CtiqRow): number {
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  if (conn === 0) return 0;
  return ((toNum(row.SUM_SLANSW_CNT) ?? 0) + (toNum(row.SUM_SLABDN_CNT) ?? 0)) / conn;
}

/**
 * 큐 상태 분류 — 지표별 2단 임계(주의/위험)로 각각 등급화한 뒤 가장 나쁜 등급 채택(worst-wins).
 *  - 포기율·최장대기·대기수: 값이 클수록 나쁨 (danger 초과→위험, warn 초과→주의)
 *  - SLA: 값이 작을수록 나쁨 (danger 미만→위험, warn 미만→주의), 인입이 있을 때만 평가
 */
export function severityOf(row: CtiqRow, t: CtiqThresholds): CtiqSeverity {
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  const wait = toNum(row.RTS_WAIT_CNT) ?? 0;
  const maxWait = toNum(row.RTS_MAXWAIT_TIME) ?? 0;
  const abdRatioPct = abandonRateOf(row) * 100;
  const slaPct = serviceLevelOf(row) * 100;

  return worstSeverity([
    overLevel(abdRatioPct, t.abandonRatioPct),
    overLevel(maxWait, t.maxWaitSec),
    overLevel(wait, t.waitCnt),
    conn > 0 ? underLevel(slaPct, t.slaPct) : 'ok', // SLA는 인입이 있어야 의미 있음
  ]);
}

/** 클수록 나쁜 지표: danger 초과→위험, warn 초과→주의. */
function overLevel(value: number, th: CtiqMetricThreshold): CtiqSeverity {
  if (value > th.danger) return 'danger';
  if (value > th.warn) return 'warn';
  return 'ok';
}

/** 작을수록 나쁜 지표(SLA): danger 미만→위험, warn 미만→주의. */
function underLevel(value: number, th: CtiqMetricThreshold): CtiqSeverity {
  if (value < th.danger) return 'danger';
  if (value < th.warn) return 'warn';
  return 'ok';
}

function worstSeverity(levels: CtiqSeverity[]): CtiqSeverity {
  return levels.reduce<CtiqSeverity>((worst, s) => (severityWeight(s) > severityWeight(worst) ? s : worst), 'ok');
}

/** severity 정렬 가중치 — 위험 우선. */
export function severityWeight(s: CtiqSeverity): number {
  switch (s) {
    case 'danger':
      return 2;
    case 'warn':
      return 1;
    case 'ok':
      return 0;
  }
}

/** 큐명·ID·GDN_NO 어디에 매칭되든 검색 통과. */
export function matchSearch(row: CtiqRow, q: string): boolean {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const haystack = [row.CTIQ_NAME, row.CTIQ_ID, row.GDN_NO]
    .filter((v) => v != null)
    .map((v) => String(v).toLowerCase())
    .join(' ');
  return haystack.includes(s);
}
