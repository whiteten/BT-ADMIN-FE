import type { AlarmRow } from './types';

/**
 * 순수 헬퍼 — 컴포넌트 의존 없음.
 * TB_CC_ERRHISTORY 원본 → 정규화 / 등급 severity / 복구 판정 / 시각 포맷.
 */

export type Severity = 'success' | 'warn' | 'danger';

// ─── 형변환 ────────────────────────────────────────────────────

export function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function strOrUndef(v: unknown): string | undefined {
  const s = str(v);
  return s.length > 0 ? s : undefined;
}

/** 원본 data 가 배열, 또는 `{rows|value|items: [...]}` 어느 형태로 와도 배열로 추출. */
export function toAlarmRows(data: unknown): AlarmRow[] {
  let list: unknown = data;
  if (list != null && !Array.isArray(list) && typeof list === 'object') {
    const obj = list as Record<string, unknown>;
    if (Array.isArray(obj.rows)) list = obj.rows;
    else if (Array.isArray(obj.value)) list = obj.value;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.alarms)) list = obj.alarms;
  }
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is Record<string, unknown> => r != null && typeof r === 'object').map(normalizeAlarm);
}

function normalizeAlarm(o: Record<string, unknown>): AlarmRow {
  return {
    id: str(o.ERR_HISOTRY_ID ?? o.ERR_HISTORY_ID ?? o.id),
    date: str(o.ERR_DATE ?? o.date),
    time: str(o.ERR_TIME ?? o.time),
    systemId: str(o.ERR_SYSTEM_ID ?? o.systemId),
    systemName: strOrUndef(o.SYSTEM_NAME ?? o.systemName),
    processId: strOrUndef(o.ERR_PROCESS_ID ?? o.processId),
    code: str(o.ERR_CODE ?? o.code),
    kind: strOrUndef(o.ERR_KIND ?? o.kind),
    level: toNum(o.ERR_LEVEL ?? o.level) ?? 0,
    status: strOrUndef(o.ERR_STATUS ?? o.status),
    issueKey: strOrUndef(o.ERR_ISSUE_KEY ?? o.issueKey),
    message: str(o.ERR_MESSAGE ?? o.message),
    memo: strOrUndef(o.ERR_MEMO ?? o.memo),
    groupId: strOrUndef(o.ERR_GROUP_ID ?? o.groupId),
    repairTime: strOrUndef(o.ERR_REPAIR_TIME ?? o.repairTime),
    notiTime: strOrUndef(o.ERR_NOTI_TIME ?? o.notiTime),
    insertTime: strOrUndef(o.DB_INSERT_TIME ?? o.insertTime),
  };
}

// ─── 등급(level) 메타 ──────────────────────────────────────────

export interface LevelMeta {
  sev: Severity;
  label: string;
  hex: string;
}

/**
 * ERR_LEVEL → 표시 메타.
 * AS-IS 확정: `IPR40S6010_SQL.xml`(errorStatus 위젯) 1=MINOR / 2=MAJOR / 3=CRITICAL.
 * 색은 SYSTEM:STAT STATUS·node-detail 과 동일(Minor=주의색, Major=위험, Critical=심각).
 */
export const LEVEL_META: Record<number, LevelMeta> = {
  0: { sev: 'success', label: '정상', hex: '#0a8a4a' },
  1: { sev: 'warn', label: 'Minor', hex: '#b76e00' },
  2: { sev: 'danger', label: 'Major', hex: '#c92a2a' },
  3: { sev: 'danger', label: 'Critical', hex: '#991b1b' },
};

export function levelMeta(level: number): LevelMeta {
  const i = Math.max(0, Math.min(3, Math.round(level)));
  return LEVEL_META[i] ?? LEVEL_META[0];
}

export function levelSeverity(level: number): Severity {
  return levelMeta(level).sev;
}

/**
 * 복구 완료 여부.
 * AS-IS 확정 규약: `ERR_REPAIR_TIME IS NULL` 이 미복구(errorStatus 위젯 쿼리·그리드 회색처리 기준).
 * 즉 복구시간이 채워졌으면 복구 완료. (0/placeholder 류는 제외)
 */
export function isResolved(row: AlarmRow): boolean {
  const t = row.repairTime?.trim();
  return !!t && t.length > 0 && !/^0+$/.test(t);
}

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
export const SEV_BORDER_SOFT: Record<Severity, string> = {
  success: 'border-bt-success/25',
  warn: 'border-bt-warn/30',
  danger: 'border-bt-danger/25',
};

// ─── 집계 ──────────────────────────────────────────────────────

export interface AlarmCounts {
  total: number;
  unresolved: number;
  resolved: number;
  /** level ≥ 2 (위험·심각) */
  danger: number;
  /** level == 1 (주의) */
  warn: number;
}

export function countAlarms(rows: AlarmRow[]): AlarmCounts {
  const c: AlarmCounts = { total: rows.length, unresolved: 0, resolved: 0, danger: 0, warn: 0 };
  for (const r of rows) {
    if (isResolved(r)) c.resolved++;
    else c.unresolved++;
    if (r.level >= 2) c.danger++;
    else if (r.level === 1) c.warn++;
  }
  return c;
}

// ─── 시각 ──────────────────────────────────────────────────────

/** ERR_DATE(yyyyMMdd) + ERR_TIME(HHmmss) → epoch ms. 파싱 실패 시 0. */
export function alarmEpoch(row: AlarmRow): number {
  const d = row.date;
  const t = (row.time + '000000').slice(0, 6);
  if (!/^\d{8}$/.test(d)) return 0;
  const yyyy = +d.slice(0, 4);
  const mm = +d.slice(4, 6) - 1;
  const dd = +d.slice(6, 8);
  const hh = +t.slice(0, 2);
  const mi = +t.slice(2, 4);
  const ss = +t.slice(4, 6);
  return new Date(yyyy, mm, dd, hh, mi, ss).getTime();
}

/** "MM-DD HH:mm:ss" 표시. */
export function fmtAlarmTime(row: AlarmRow): string {
  const d = row.date;
  const t = (row.time + '000000').slice(0, 6);
  if (!/^\d{8}$/.test(d)) return `${d} ${t}`.trim();
  return `${d.slice(4, 6)}-${d.slice(6, 8)} ${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
}

/** nowMs 기준 "n분 전" 류 상대 표기. */
export function fmtRelative(epochMs: number, nowMs: number): string {
  if (epochMs <= 0) return '';
  const sec = Math.max(0, Math.floor((nowMs - epochMs) / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}
