import { type ReactNode, useState } from 'react';
import { Activity, AlertTriangle, PowerOff } from 'lucide-react';
import { DEMO_NODES, isNodeDemoMode } from './demoData';
import {
  SEV_BG,
  SEV_BG_SOFT,
  SEV_BORDER_SOFT,
  SEV_TEXT,
  STATUS_META,
  type Severity,
  countModules,
  countSystems,
  fmtUpdateTime,
  moduleRedundancy,
  moduleStatusCount,
  toSystemNodes,
} from './helpers';
import type { NodeModule, NodeStatus, ResourceStat, SystemNode } from './types';

/**
 * 노드 상세 위젯 — "헬스보드 신호등을 눌렀을 때 그 안에서 보는 시스템 자원 상세".
 *
 * 시안 근거: docs/insight/monitoring/mvp-design/wireframes/08-node-detail.html
 * 데이터: IO `SYSTEM:STAT` (시스템별 CPU/메모리/디스크/프로세스 + 모듈 상태).
 *
 * 의미 구분 (중요):
 *  - 시스템 `IS_ACTIVE`(04) = 가동/다운(생존 여부). 다운이면 자원·모듈 stale → 최상위 위험·상단 정렬·dim.
 *  - 모듈 `CLASS_ITEMS.IS_ACTIVE` = 이중화(Active/Standby). 모듈 dot 으로 Active=꽉참 / Standby=링.
 *
 * 카드 단위 = 모듈(CLASS_CD). 모듈 칩을 SYSTEM_ID 기준으로 그룹핑하고, 시스템 헤더에 가동/다운과
 * 자원 요약을 둔다. 위젯 자체 헤더는 두지 않으며(대시보드 카드 헤더가 제공) 캔버스 위 흰 카드 + bt-shadow.
 */
export interface NodeDetailWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

/** 상태 필터칩 정의 (Normal/Minor/Major/Critical) — 모듈 상태 기준. */
const STATUS_FILTERS: { key: NodeStatus; label: string }[] = [
  { key: 0, label: '정상' },
  { key: 1, label: 'Minor' },
  { key: 2, label: 'Major' },
  { key: 3, label: 'Critical' },
];

export default function NodeDetailWidget({ data }: NodeDetailWidgetProps) {
  const nodes = isNodeDemoMode() ? DEMO_NODES : fallbackNodes(toSystemNodes(data));

  const [alertOnly, setAlertOnly] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<NodeStatus>>(() => new Set([0, 1, 2, 3]));

  const mods = countModules(nodes);
  const sys = countSystems(nodes);

  // 시스템(SYSTEM_ID) 그룹. 다운 시스템은 항상 노출(최상위 위험)·모듈 미필터, 가동 시스템만 모듈 필터.
  const groups = nodes
    .map((system) => {
      const down = !system.isAlive;
      const modules = down ? system.modules : system.modules.filter((m) => activeStatuses.has(m.status)).filter((m) => !alertOnly || m.status >= 2);
      return { system, down, modules };
    })
    .filter((g) => g.down || g.modules.length > 0)
    .sort((a, b) => (a.down === b.down ? 0 : a.down ? -1 : 1) || b.system.status - a.system.status || a.system.systemName.localeCompare(b.system.systemName));

  const visibleModuleCount = groups.reduce((n, g) => n + (g.down ? 0 : g.modules.length), 0);

  const toggleStatus = (k: NodeStatus) =>
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 ═══ */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="전체 모듈" value={mods.total} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatTile label="정상" value={mods.normal} sev="success" />
        <StatTile label="Minor" value={mods.minor} sev="warn" />
        <StatTile label="위험" sub="모듈" value={mods.critical} sev="danger" pulse={mods.critical > 0} />
        <StatTile label="다운" sub="시스템" value={sys.down} sev="danger" icon={<PowerOff className="h-3.5 w-3.5" />} pulse={sys.down > 0} />
      </section>

      {/* ═══ 필터 바 ═══ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bt-border bg-bt-bg px-4 py-2.5 bt-shadow">
        {STATUS_FILTERS.map((f) => {
          const active = activeStatuses.has(f.key);
          const m = STATUS_META[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleStatus(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
                active ? `${SEV_BG_SOFT[m.sev]} ${SEV_TEXT[m.sev]} ${SEV_BORDER_SOFT[m.sev]}` : 'border-bt-border bg-bt-bg text-bt-fg-muted hover:bg-bt-bg-muted'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hex }} />
              {m.label} <span className="tabular-nums">{moduleStatusCount(nodes, f.key)}</span>
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
        </span>
        <span className="ml-1 text-[11px] text-bt-fg-muted">
          모듈 {visibleModuleCount} / {mods.total} · 시스템 {sys.total}대{sys.down > 0 ? ` (다운 ${sys.down})` : ''}
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

      {/* ═══ 시스템 카드 그리드 (밀도 우선) ═══ */}
      {groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-bt-border bg-bt-bg py-16 text-[13px] text-bt-fg-muted bt-shadow">
          표시할 모듈이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {groups.map((g) => (
            <SystemCard key={g.system.systemId} system={g.system} modules={g.modules} down={g.down} />
          ))}
        </div>
      )}
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

// ─── 시스템 카드 (밀집형 — 헤더 가동/다운 + 자원 + 모듈 이중화 칩) ───

function SystemCard({ system, modules, down }: { system: SystemNode; modules: NodeModule[]; down: boolean }) {
  const m = STATUS_META[system.status];
  const danger = !down && system.status >= 2;
  const redund = moduleRedundancy(system);
  const barColor = down ? 'bg-bt-danger' : SEV_BG[m.sev];
  const ledHex = down ? '#c92a2a' : m.hex;
  return (
    <section
      className={`relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-bt-bg p-3 pl-4 bt-shadow ${
        down || danger ? `${SEV_BORDER_SOFT.danger} bt-pulse-ring` : 'border-bt-border'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${barColor}`} />

      {/* 헤더 — LED·이름·TYPE·#ID + 가동/다운 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${down || danger ? 'bt-pulse' : ''}`} style={{ background: ledHex, boxShadow: `0 0 6px ${ledHex}` }} />
          <span className="truncate text-[13px] font-bold" title={`${system.systemName} · ${down ? '다운' : m.label}`}>
            {system.systemName}
          </span>
          {system.type && <span className="shrink-0 rounded bg-bt-bg-muted px-1 py-px text-[9.5px] font-semibold text-bt-fg-muted">{system.type}</span>}
          <span className="shrink-0 tabular-nums text-[10px] text-bt-fg-muted">#{system.systemId}</span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold ${
            down ? 'bg-bt-danger-soft text-bt-danger' : 'bg-bt-success-soft text-bt-success'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${down ? 'bg-bt-danger bt-pulse' : 'bg-bt-success'}`} />
          {down ? '다운' : '가동'}
        </span>
      </div>

      {/* 자원 인라인 — 다운이면 stale(흐림) */}
      <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-bt-fg-muted ${down ? 'opacity-50' : ''}`}>
        {down ? (
          <span className="italic">자원·프로세스 보고 중단 (stale)</span>
        ) : (
          <>
            <ResStat label="CPU" stat={system.cpu} />
            <ResStat label="MEM" stat={system.mem} />
            <ResStat label="DISK" stat={system.disk} />
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_META[system.process.status].hex }} />
              PCS
              <b className="tabular-nums text-bt-fg">
                {system.process.running}/{system.process.total}
              </b>
            </span>
          </>
        )}
        <span className="ml-auto tabular-nums text-bt-fg-muted/80">{fmtUpdateTime(system.updateTime)}</span>
      </div>

      {/* 모듈 칩 (이중화 dot) + Active/Standby 롤업 */}
      <div className={`flex flex-wrap items-center gap-1 border-t border-bt-border pt-2 ${down ? 'opacity-50' : ''}`}>
        {modules.map((mod) => (
          <ModuleChip key={mod.code} module={mod} />
        ))}
        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-bt-fg-muted" title="모듈 이중화 — Active / Standby">
          A {redund.active} · S {redund.standby}
        </span>
      </div>
    </section>
  );
}

/** 자원 사용율 인라인 (라벨 + 상태색 % ). */
function ResStat({ label, stat }: { label: string; stat: ResourceStat }) {
  const hex = STATUS_META[stat.status].hex;
  const pct = Math.max(0, Math.min(100, stat.rate));
  return (
    <span className="inline-flex items-center gap-0.5">
      {label}
      <b className="tabular-nums" style={{ color: hex }}>
        {pct}%
      </b>
    </span>
  );
}

// ─── 모듈 칩 (CLASS_ITEMS 키 1개 — 이중화: Active 꽉참 / Standby 링) ──

function ModuleChip({ module }: { module: NodeModule }) {
  const m = STATUS_META[module.status];
  const down = module.status >= 2;
  const standby = !module.isActive;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-medium ${
        down ? `${SEV_BORDER_SOFT.danger} bg-bt-danger-soft/40` : 'border-bt-border bg-bt-bg-muted/50'
      } ${standby ? 'text-bt-fg-muted opacity-70' : 'text-bt-fg'}`}
      title={`${module.code} · ${m.label} · ${standby ? 'Standby' : 'Active'}`}
    >
      {standby ? (
        <span className="h-2 w-2 shrink-0 rounded-full border-[1.5px] bg-transparent" style={{ borderColor: m.hex }} />
      ) : (
        <span className={`h-2 w-2 shrink-0 rounded-full ${down ? 'bt-pulse' : ''}`} style={{ background: m.hex }} />
      )}
      {module.code}
    </span>
  );
}
