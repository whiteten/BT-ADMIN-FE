import { type ReactNode, useState } from 'react';
import { Activity, AlertTriangle, PowerOff } from 'lucide-react';
import { DEMO_NODES, isNodeDemoMode } from './demoData';
import { SEV_BG, SEV_BG_SOFT, SEV_BORDER_SOFT, SEV_TEXT, type Severity, countSystems, toSystemNodes } from './helpers';
import NodeDetailGrid from './parts/NodeDetailGrid';
import type { SystemNode } from './types';

/**
 * 노드 상세 위젯 — "헬스보드 신호등을 눌렀을 때 그 안에서 보는 시스템 자원 상세".
 *
 * 시안 근거: docs/insight/monitoring/mvp-design/wireframes/08-node-detail.html
 * 데이터: IO `SYSTEM:STAT` (시스템별 CPU/메모리/디스크/프로세스 + 모듈 상태).
 *
 * 표(ag-Grid) 형태 — 시스템 다수 비교·밀도가 목적이라 카드보다 표. 정렬·가상스크롤·컬럼 리사이즈는
 * ag-Grid 가 담당하고, 좌측 severity 바·위험순 정렬·pulse 로 위험/다운 즉시 식별. (시안 NOTE 규모 대응)
 *
 * 의미 구분 (중요):
 *  - 시스템 `IS_ACTIVE`(04) = 가동/다운(생존 여부). 다운이면 자원·모듈 stale → 최상위 위험·상단 정렬·dim.
 *  - 모듈 `CLASS_ITEMS.IS_ACTIVE` = 이중화(Active/Standby). 모듈 dot 으로 Active=꽉참 / Standby=링.
 */
export interface NodeDetailWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

/** 가동 시스템 STATUS 분류 버킷 — 표 행 필터·정렬용. */
type SysBucket = 'normal' | 'minor' | 'danger';

function sysBucket(n: SystemNode): SysBucket {
  if (n.status >= 2) return 'danger';
  if (n.status === 1) return 'minor';
  return 'normal';
}

/** 상태 필터칩 정의 (가동 시스템 기준 — 다운은 항상 노출이라 별도 카운트 칩). */
const BUCKET_FILTERS: { key: SysBucket; label: string; sev: Severity }[] = [
  { key: 'danger', label: '위험', sev: 'danger' },
  { key: 'minor', label: 'Minor', sev: 'warn' },
  { key: 'normal', label: '정상', sev: 'success' },
];

const SEV_HEX: Record<Severity, string> = { success: '#0a8a4a', warn: '#b76e00', danger: '#c92a2a' };

export default function NodeDetailWidget({ data }: NodeDetailWidgetProps) {
  const nodes = isNodeDemoMode() ? DEMO_NODES : fallbackNodes(toSystemNodes(data));

  const [alertOnly, setAlertOnly] = useState(false);
  const [activeBuckets, setActiveBuckets] = useState<Set<SysBucket>>(() => new Set<SysBucket>(['normal', 'minor', 'danger']));

  const sys = countSystems(nodes);
  const bucketCount: Record<SysBucket, number> = { normal: sys.normal, minor: sys.minor, danger: sys.danger };

  // 표 행(시스템). 다운은 항상 노출(최상위 위험)·필터 무시. 가동 시스템만 버킷·위험만 필터.
  // 초기 정렬: 다운 우선 → STATUS 내림차순 → 이름 (이후 컬럼 헤더로 재정렬 가능).
  const rows = nodes
    .filter((n) => {
      if (!n.isAlive) return true;
      const b = sysBucket(n);
      if (alertOnly && b !== 'danger') return false;
      return activeBuckets.has(b);
    })
    .sort((a, b) => (a.isAlive === b.isAlive ? 0 : a.isAlive ? 1 : -1) || b.status - a.status || a.systemName.localeCompare(b.systemName));

  const visibleAlive = rows.filter((n) => n.isAlive).length;

  const toggleBucket = (k: SysBucket) =>
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 (시스템 기준) ═══ */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="전체 시스템" value={sys.total} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatTile label="다운" sub="시스템" value={sys.down} sev="danger" icon={<PowerOff className="h-3.5 w-3.5" />} pulse={sys.down > 0} />
        <StatTile label="위험" sub="Major·Crit" value={sys.danger} sev="danger" pulse={sys.danger > 0} />
        <StatTile label="Minor" value={sys.minor} sev="warn" />
        <StatTile label="정상" value={sys.normal} sev="success" />
      </section>

      {/* ═══ 필터·정렬 바 ═══ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bt-border bg-bt-bg px-4 py-2.5 bt-shadow">
        {/* 다운 — 항상 노출이라 토글 아님, 카운트만 */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-bt-danger/25 bg-bt-danger-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-bt-danger">
          <span className="h-1.5 w-1.5 rounded-full bg-bt-danger" />
          다운 <span className="tabular-nums">{sys.down}</span>
        </span>
        {BUCKET_FILTERS.map((f) => {
          const active = activeBuckets.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleBucket(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
                active ? `${SEV_BG_SOFT[f.sev]} ${SEV_TEXT[f.sev]} ${SEV_BORDER_SOFT[f.sev]}` : 'border-bt-border bg-bt-bg text-bt-fg-muted hover:bg-bt-bg-muted'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV_HEX[f.sev] }} />
              {f.label} <span className="tabular-nums">{bucketCount[f.key]}</span>
            </button>
          );
        })}
        {/* 이중화 레전드 */}
        <span className="ml-1 inline-flex items-center gap-2 border-l border-bt-border pl-2 text-[10.5px] text-bt-fg-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-bt-fg-muted" />
            Active
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border-[1.5px] border-bt-fg-muted" />
            Standby
          </span>
          <span className="text-bt-fg-muted/70">(모듈 이중화)</span>
        </span>
        <span className="ml-1 text-[11px] text-bt-fg-muted">
          가동 {visibleAlive} / {sys.alive}대{sys.down > 0 ? ` · 다운 ${sys.down}` : ''}
        </span>
        <button
          type="button"
          onClick={() => setAlertOnly((b) => !b)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors ${
            alertOnly ? 'bg-bt-danger-soft text-bt-danger' : 'bg-bt-bg-muted text-bt-fg-muted hover:text-bt-fg'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          위험만 {alertOnly ? '●ON' : '○OFF'}
        </button>
      </div>

      {/* ═══ 시스템 표 (ag-Grid) ═══ */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-bt-border bg-bt-bg bt-shadow">
        <NodeDetailGrid rows={rows} />
      </div>
    </div>
  );
}

/** 라이브 데이터가 비면 데모로 폴백 (BE 집계 위젯 연동 전 임시 — 헬스보드와 동일 정책). */
function fallbackNodes(live: SystemNode[]): SystemNode[] {
  return live.length > 0 ? live : DEMO_NODES;
}

// ─── KPI 타일 ──────────────────────────────────────────────────

function StatTile({ label, sub, value, sev, icon, pulse }: { label: string; sub?: string; value: number; sev?: Severity; icon?: ReactNode; pulse?: boolean }) {
  const accent = sev ? SEV_BG[sev] : 'bg-bt-border-strong';
  const text = sev ? SEV_TEXT[sev] : 'text-bt-fg';
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-4 pt-3.5 pb-3 bt-shadow ${pulse ? 'bt-pulse-ring' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-[28px] font-extrabold leading-none tabular-nums ${text}`}>{value}</span>
        {sub && <span className="text-[11px] text-bt-fg-muted">{sub}</span>}
      </div>
    </div>
  );
}
