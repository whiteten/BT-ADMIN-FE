import type { CtiqRow, CtiqSeverity, CtiqThresholds } from './types';

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

/**
 * 큐 상태 분류 — 임계값과 raw 값 비교해 ok/warn/alert/danger/idle 산정.
 * 판정 우선순위(높음 → 낮음): danger > alert > warn > ok > idle.
 *  - idle: 인입 0 + 대기 0 + 로그인상담사 0 → 휴면
 *  - danger: 포기율 임계 초과
 *  - alert: 최장대기 임계 초과 OR SLA 임계 미달
 *  - warn: 대기수 임계 초과
 *  - ok: 그 외
 */
export function severityOf(row: CtiqRow, t: CtiqThresholds): CtiqSeverity {
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  const wait = toNum(row.RTS_WAIT_CNT) ?? 0;
  const login = toNum(row.RTS_EXP_LOGIN_AGT) ?? 0;
  if (conn === 0 && wait === 0 && login === 0) return 'idle';

  const abdRatioPct = (toNum(row.KPI_ABANDON_RATIO) ?? 0) * 100;
  if (abdRatioPct > t.abandonRatioPct) return 'danger';

  const maxWait = toNum(row.RTS_MAXWAIT_TIME) ?? 0;
  const slaPct = (toNum(row.KPI_SVCLEVEL) ?? 0) * 100;
  if (maxWait > t.maxWaitSec) return 'alert';
  // SLA는 인입이 있어야 의미 있음.
  if (conn > 0 && slaPct < t.slaPct) return 'alert';

  if (wait > t.waitCnt) return 'warn';
  return 'ok';
}

/** severity 정렬 가중치 — 위험 우선. */
export function severityWeight(s: CtiqSeverity): number {
  switch (s) {
    case 'danger':
      return 4;
    case 'alert':
      return 3;
    case 'warn':
      return 2;
    case 'ok':
      return 1;
    case 'idle':
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
