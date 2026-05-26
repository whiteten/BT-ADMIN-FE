import { statusMeta } from './statusMap';
import type { AgentRow, GroupBy } from './types';

/**
 * 순수 헬퍼 모음. 컴포넌트 의존 없음 — 단위 테스트 친화적.
 */

// ─── 타입 / 형변환 ─────────────────────────────────────────────

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

/**
 * 원본 data 가 List, 또는 `{rows: List}` 어느 형태로 와도 안전하게 추출.
 * Aggregation 엔진의 `{value: [...]}` 래핑도 함께 처리.
 */
export function toAgentRows(data: unknown): AgentRow[] {
  if (data == null) return [];
  let list: unknown = data;
  if (!Array.isArray(list) && typeof list === 'object') {
    const obj = list as Record<string, unknown>;
    if (Array.isArray(obj.rows)) list = obj.rows;
    else if (Array.isArray(obj.value)) list = obj.value;
    else if (Array.isArray(obj.items)) list = obj.items;
  }
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is AgentRow => r != null && typeof r === 'object');
}

// ─── 시간 ──────────────────────────────────────────────────────

/**
 * 서버 STATUS_TIME 을 ms 단위 timestamp 로 정규화.
 * 지원: epoch(초), epoch(ms), "yyyyMMddHHmmss" 14자리.
 */
export function parseServerTime(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v > 1e12 ? v : v * 1000; // 1e12 = 2001 년 (초/ms 자동 판별)
  }
  const s = String(v).trim();
  if (!s) return null;
  // yyyyMMddHHmmss
  if (/^\d{14}$/.test(s)) {
    const yyyy = +s.slice(0, 4);
    const mm = +s.slice(4, 6) - 1;
    const dd = +s.slice(6, 8);
    const hh = +s.slice(8, 10);
    const mi = +s.slice(10, 12);
    const ss = +s.slice(12, 14);
    return new Date(yyyy, mm, dd, hh, mi, ss).getTime();
  }
  const n = Number(s);
  if (Number.isFinite(n)) return n > 1e12 ? n : n * 1000;
  return null;
}

/**
 * 현재 상태 유지 시간 (초). STATUS_TIME 이 있으면 클라이언트 now 기반 실시간 계산.
 * 없으면 서버가 보낸 STATUS_DURATION 사용. 둘 다 없으면 0.
 */
export function liveDurationSec(row: AgentRow, nowMs: number): number {
  const startMs = parseServerTime(row.STATUS_TIME);
  if (startMs != null) {
    const sec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    return sec;
  }
  return toNum(row.STATUS_DURATION) ?? 0;
}

/** mm:ss 또는 h:mm:ss. 음수는 0 으로 클램프. */
export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/** "오늘 7h 32m" 같은 짧은 경과 표시. */
export function formatElapsedShort(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

// ─── 검색 / 정렬 ───────────────────────────────────────────────

/** 상담사명·상담그룹명만 대상으로 부분일치 검색 (대소문자 무시). */
export function matchSearch(row: AgentRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  const hay = [row.AGENT_NAME, row.GROUP_NAME].map((v) => (v == null ? '' : String(v).toLowerCase())).join(' ');
  return hay.includes(needle);
}

// ─── 그룹화 ────────────────────────────────────────────────────

export interface AgentGroup {
  id: string;
  label: string;
  sub?: string;
  rows: AgentRow[];
}

export function groupAgents(rows: AgentRow[], by: GroupBy): AgentGroup[] {
  if (by === 'none') return [{ id: '_all', label: '전체', rows }];

  const buckets = new Map<string, AgentGroup>();
  for (const r of rows) {
    let id: string, label: string, sub: string | undefined;
    if (by === 'queue') {
      id = toStr(r.GROUP_ID) || '_unassigned';
      label = r.GROUP_NAME ?? (id === '_unassigned' ? '미배정' : `GROUP ${id}`);
      sub = id === '_unassigned' ? undefined : `SKILL_${id}`;
    } else if (by === 'state') {
      const meta = statusMeta(r.AGENT_STATUS, r.REASON_CODE);
      id = meta.group;
      label = meta.label.split(' ')[0]; // 통화 IB → "통화"
      sub = undefined;
    } else {
      const cat = toStr(r.CATEGORY_TYPE) || '0';
      id = cat;
      label = cat === '0' ? '미지정' : `카테고리 ${Number(cat) / 10}`;
      sub = undefined;
    }
    let g = buckets.get(id);
    if (!g) {
      g = { id, label, sub, rows: [] };
      buckets.set(id, g);
    }
    g.rows.push(r);
  }
  // 정렬: 인원 많은 그룹 먼저
  return [...buckets.values()].sort((a, b) => b.rows.length - a.rows.length);
}

// ─── 누적 KPI 파생값 ───────────────────────────────────────────

/**
 * "응대 부하 (Workload)": 누적 통화시간 / 로그인 후 경과시간.
 * 부하 % = (talk_total / shift_total) * 100. 0~100 클램프.
 */
export function occupancyPct(row: AgentRow, nowMs: number): number | null {
  const ib = toNum(row.SUM_IB_TALKTIME) ?? 0;
  const ob = toNum(row.SUM_OB_TALKTIME) ?? 0;
  const totalTalk = ib + ob;
  if (totalTalk <= 0) return null;

  const loginMs = parseServerTime(row.LOGIN_TIME);
  if (loginMs == null) return null;
  const shiftSec = Math.max(1, Math.floor((nowMs - loginMs) / 1000));
  return Math.min(100, Math.round((totalTalk / shiftSec) * 100));
}

/** 평균 통화 시간 (초) = 응답통화시간합 / 응답수. 응답수 0 이면 null. */
export function avgTalkSec(row: AgentRow): number | null {
  const explicit = toNum(row.AVG_ANSTALK_TIME);
  if (explicit != null && explicit > 0) return explicit;
  const ib = toNum(row.SUM_IB_TALKTIME) ?? 0;
  const ob = toNum(row.SUM_OB_TALKTIME) ?? 0;
  const ans = toNum(row.SUM_ANSW_CNT) ?? 0;
  const ob_succ = toNum(row.SUM_OB_SUCC) ?? 0;
  const totalCalls = ans + ob_succ;
  if (totalCalls <= 0) return null;
  return Math.round((ib + ob) / totalCalls);
}

/** 응대율 % (0~100). 서버 KPI 우선, 없으면 (응답 / 인입). */
export function answerRatePct(row: AgentRow): number | null {
  const k = toNum(row.KPI_ANSWER_RATE2) ?? toNum(row.KPI_ANSWER_RATE);
  if (k != null) return k > 1 ? Math.round(k) : Math.round(k * 100);
  const ans = toNum(row.SUM_ANSW_CNT);
  const conn = toNum(row.SUM_CONN_CNT);
  if (ans == null || conn == null || conn === 0) return null;
  return Math.round((ans / conn) * 100);
}

/** 합산 처리 호수 = IB응답 + OB성공. */
export function totalHandled(row: AgentRow): number {
  return (toNum(row.SUM_ANSW_CNT) ?? 0) + (toNum(row.SUM_OB_SUCC) ?? 0);
}

/** 호전환율 % — 응대 대비 발신전환. */
export function transferRatePct(row: AgentRow): number | null {
  const ans = toNum(row.SUM_ANSW_CNT);
  const trnsOut = toNum(row.SUM_TRNS_OUT);
  if (ans == null || ans === 0 || trnsOut == null) return null;
  return Math.round((trnsOut / ans) * 100);
}

/** 후처리 평균 시간 (초). */
export function avgAcwSec(row: AgentRow): number | null {
  const cnt = toNum(row.SUM_ACW_CNT);
  const time = toNum(row.SUM_ACW_TIME);
  if (cnt == null || cnt === 0 || time == null) return null;
  return Math.round(time / cnt);
}

/** 누적 통화 시간 (초) = IB 통화시간 + OB 통화시간. */
export function totalTalkSec(row: AgentRow): number {
  return (toNum(row.SUM_IB_TALKTIME) ?? 0) + (toNum(row.SUM_OB_TALKTIME) ?? 0);
}

/** 서비스레벨 % (0~100). 서버 KPI 우선. 값이 1 이하면 비율로 보고 ×100. */
export function serviceLevelPct(row: AgentRow): number | null {
  const k = toNum(row.KPI_SVCLEVEL2) ?? toNum(row.KPI_SVCLEVEL);
  if (k == null) return null;
  return k > 1 ? Math.round(k) : Math.round(k * 100);
}

/**
 * MoS (Mean Opinion Score) 등급 — 레거시 `ieExtDnStatus.jsp` `getMosClass()` 와 1:1 동일.
 *  - good      ≥ 4.0  좋음
 *  - normal    ≥ 3.5  보통
 *  - bad       ≥ 3.0  나쁨
 *  - verybad   ≥ 2.0  매우나쁨
 *  - unaccept  ≥ 1.0  허용불가
 *  - unavail   < 1.0  미사용 (음성 중계 없음)
 *
 * `null` / 음수 → 측정값 없음으로 간주하여 `null` 반환 (호출측에서 표시 안 함).
 */
export type MosLevel = 'good' | 'normal' | 'bad' | 'verybad' | 'unaccept' | 'unavail';

export function mosLevel(mos: number | null | undefined): MosLevel | null {
  if (mos == null) return null;
  if (mos < 0) return null;
  if (mos < 1.0) return 'unavail';
  if (mos >= 4.0) return 'good';
  if (mos >= 3.5) return 'normal';
  if (mos >= 3.0) return 'bad';
  if (mos >= 2.0) return 'verybad';
  return 'unaccept';
}

// ─── 키 / 식별 ─────────────────────────────────────────────────

/** React key — Math.random() 절대 금지. 폴백은 인덱스 prefix. */
export function agentKey(row: AgentRow, idx: number): string {
  const id = row.AGENT_ID ?? row.AGENT_LOGIN_ID ?? row.LOGIN_DN_NO;
  if (id != null && id !== '') return `a_${id}`;
  return `idx_${idx}`;
}

/** 이름 첫 글자 (이니셜 원). */
export function initialOf(row: AgentRow): string {
  const name = toStr(row.AGENT_NAME).trim();
  if (name) return name.charAt(0);
  const id = toStr(row.AGENT_LOGIN_ID).trim();
  if (id) return id.charAt(0).toUpperCase();
  return '?';
}
