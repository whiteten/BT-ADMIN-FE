import type { NodeModule, NodeStatus, SystemNode } from './types';

/**
 * 순수 헬퍼 — 컴포넌트 의존 없음.
 * SYSTEM:STAT 원본 → 정규화 / 상태 토큰 / 시각 포맷.
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

/** 0~3 범위로 클램프한 NodeStatus. 범위 밖·결측은 0(Normal). */
function toStatus(v: unknown): NodeStatus {
  const n = toNum(v);
  if (n == null) return 0;
  const i = Math.round(n);
  if (i <= 0) return 0;
  if (i >= 3) return 3;
  return i as NodeStatus;
}

/**
 * 원본 data 가 배열, 또는 `{rows|value|items: [...]}` 어느 형태로 와도 배열로 추출.
 * `SYSTEM:STAT` 은 Hash 전체 hvals 결과(시스템별 JSON 객체 배열)로 내려온다고 가정.
 */
export function toSystemNodes(data: unknown): SystemNode[] {
  let list: unknown = data;
  if (list != null && !Array.isArray(list) && typeof list === 'object') {
    const obj = list as Record<string, unknown>;
    if (Array.isArray(obj.rows)) list = obj.rows;
    else if (Array.isArray(obj.value)) list = obj.value;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.systems)) list = obj.systems;
  }
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is Record<string, unknown> => r != null && typeof r === 'object').map(normalizeNode);
}

/** CLASS_ITEMS ({ CLASS_CD: { STATUS, IS_ACTIVE } }) → 모듈 배열. */
function parseModules(raw: unknown): NodeModule[] {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([code, v]) => {
    const m = (v ?? {}) as Record<string, unknown>;
    const nm = m.NAME ?? m.name;
    return {
      code,
      name: nm != null && String(nm).trim() ? String(nm).trim() : undefined,
      status: toStatus(m.STATUS ?? m.status),
      isActive: num0(m.IS_ACTIVE ?? m.isActive) === 1,
    };
  });
}

function normalizeNode(o: Record<string, unknown>): SystemNode {
  return {
    systemId: String(o.SYSTEM_ID ?? o.systemId ?? ''),
    systemName: String(o.SYSTEM_NAME ?? o.systemName ?? o.SYSTEM_ID ?? '시스템'),
    status: toStatus(o.STATUS ?? o.status),
    cpu: { rate: num0(o.CPU_RATE ?? o.cpuRate), status: toStatus(o.CPU_STATUS ?? o.cpuStatus) },
    mem: { rate: num0(o.MEM_RATE ?? o.memRate), status: toStatus(o.MEM_STATUS ?? o.memStatus) },
    disk: { rate: num0(o.DISK_RATE ?? o.diskRate), status: toStatus(o.DISK_STATUS ?? o.diskStatus) },
    process: {
      total: num0(o.PCS_TOT_COUNT ?? o.pcsTotCount),
      // 실행 중 프로세스 수 — 실데이터 필드는 PCS_COUNT(레거시 PCS_RUN_COUNT 폴백).
      running: num0(o.PCS_COUNT ?? o.PCS_RUN_COUNT ?? o.pcsCount ?? o.pcsRunCount),
      status: toStatus(o.PCS_STATUS ?? o.pcsStatus),
    },
    modules: parseModules(o.CLASS_ITEMS ?? o.classItems),
    updateTime: o.DB_UPDATE_TIME != null ? String(o.DB_UPDATE_TIME) : undefined,
  };
}

// ─── 상태 메타 (4단계) ─────────────────────────────────────────

export interface StatusMeta {
  /** Severity 토큰 — success/warn/danger 로 축약 (Major·Critical 모두 danger). */
  sev: 'success' | 'warn' | 'danger';
  label: string;
  /** SVG/inline hex */
  hex: string;
}

/** SYSTEM:STAT STATUS(0~3) → 표시 메타. 위험(3)은 danger 이면서 pulse 강조 대상. */
export const STATUS_META: Record<NodeStatus, StatusMeta> = {
  0: { sev: 'success', label: '정상', hex: '#0a8a4a' },
  1: { sev: 'warn', label: '주의', hex: '#b76e00' },
  2: { sev: 'danger', label: '경고', hex: '#c92a2a' },
  3: { sev: 'danger', label: '위험', hex: '#991b1b' },
};

export type Severity = 'success' | 'warn' | 'danger';

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

export interface SystemCounts {
  total: number;
  /** STATUS=0 (정상) */
  normal: number;
  /** STATUS=1 (Minor / 주의) */
  minor: number;
  /** STATUS=2 (Major / 경고) */
  major: number;
  /** STATUS=3 (Critical / 위험) */
  critical: number;
}

/** 시스템(행) 기준 집계 — STATUS(정상/주의/경고/위험) 분류. */
export function countSystems(nodes: SystemNode[]): SystemCounts {
  const c: SystemCounts = { total: nodes.length, normal: 0, minor: 0, major: 0, critical: 0 };
  for (const n of nodes) {
    if (n.status === 0) c.normal++;
    else if (n.status === 1) c.minor++;
    else if (n.status === 2) c.major++;
    else c.critical++;
  }
  return c;
}

export interface ModuleCounts {
  /** 전체 모듈 수 */
  total: number;
  normal: number;
  minor: number;
  /** Major + Critical (위험) */
  critical: number;
}

/** 모듈(CLASS_ITEMS 키) 상태 집계. */
export function countModules(nodes: SystemNode[]): ModuleCounts {
  const c: ModuleCounts = { total: 0, normal: 0, minor: 0, critical: 0 };
  for (const n of nodes) {
    for (const m of n.modules) {
      c.total++;
      if (m.status === 0) c.normal++;
      else if (m.status === 1) c.minor++;
      else c.critical++;
    }
  }
  return c;
}

/** 특정 상태(0~3)의 모듈 총 개수 — 필터칩 카운트용. */
export function moduleStatusCount(nodes: SystemNode[], status: NodeStatus): number {
  let n = 0;
  for (const sys of nodes) {
    for (const m of sys.modules) if (m.status === status) n++;
  }
  return n;
}

// ─── 시각 포맷 ─────────────────────────────────────────────────

/** yyyyMMddHHmmss → "yyyy-MM-dd HH:mm:ss". 형식이 아니면 원본 반환. */
export function fmtUpdateTime(v?: string): string {
  if (!v) return '—';
  const s = v.trim();
  if (/^\d{14}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
  }
  return s;
}
