import { type ReactNode, useState } from 'react';
import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
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
 * ag-Grid 가 담당하고, 좌측 severity 바·위험순 정렬·pulse 로 위험 즉시 식별. (시안 NOTE 규모 대응)
 *
 * 시스템 상태는 STATUS(0:정상/1:주의/2:경고/3:위험) 만으로 표기한다.
 * 모듈 `CLASS_ITEMS.IS_ACTIVE` = 이중화(Active/Standby). 모듈 dot 으로 Active=꽉참 / Standby=링.
 */
export interface NodeDetailWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

/** 가동 시스템 STATUS 분류 버킷 — 표 행 필터·정렬용 (0:정상 / 1:minor / 2:major / 3:critical). */
type SysBucket = 'normal' | 'minor' | 'major' | 'critical';

function sysBucket(n: SystemNode): SysBucket {
  if (n.status >= 3) return 'critical';
  if (n.status === 2) return 'major';
  if (n.status === 1) return 'minor';
  return 'normal';
}

/** 상태 필터칩 정의 (STATUS 기준). 라벨은 정상/주의/경고/위험. */
const BUCKET_FILTERS: { key: SysBucket; label: string; sev: Severity; hex: string }[] = [
  { key: 'critical', label: '위험', sev: 'danger', hex: '#991b1b' },
  { key: 'major', label: '경고', sev: 'danger', hex: '#c92a2a' },
  { key: 'minor', label: '주의', sev: 'warn', hex: '#b76e00' },
  { key: 'normal', label: '정상', sev: 'success', hex: '#0a8a4a' },
];

export default function NodeDetailWidget({ data }: NodeDetailWidgetProps) {
  const nodes = isNodeDemoMode() ? DEMO_NODES : toSystemNodes(data);

  const [activeBuckets, setActiveBuckets] = useState<Set<SysBucket>>(() => new Set<SysBucket>(['normal', 'minor', 'major', 'critical']));

  const sys = countSystems(nodes);
  const bucketCount: Record<SysBucket, number> = { normal: sys.normal, minor: sys.minor, major: sys.major, critical: sys.critical };

  // 표 행(시스템). STATUS 버킷 필터. 초기 정렬: STATUS 내림차순 → 이름 (이후 컬럼 헤더로 재정렬 가능).
  const rows = nodes.filter((n) => activeBuckets.has(sysBucket(n))).sort((a, b) => b.status - a.status || a.systemName.localeCompare(b.systemName));

  const toggleBucket = (k: SysBucket) =>
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 (시스템 기준, STATUS) — 전체 / 위험 / 경고 / 주의 / 정상 ═══ */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="전체 시스템" sub="대" value={sys.total} hex="#1F79D4" blackValue icon={<Server className="h-3.5 w-3.5" />} />
        <StatTile label="위험" sub="대" value={sys.critical} hex="#991b1b" pulse={sys.critical > 0} icon={<AlertOctagon className="h-3.5 w-3.5" />} />
        <StatTile label="경고" sub="대" value={sys.major} hex="#c92a2a" pulse={sys.major > 0} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <StatTile label="주의" sub="대" value={sys.minor} hex="#b76e00" icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <StatTile label="정상" sub="대" value={sys.normal} hex="#0a8a4a" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </section>

      {/* ═══ 필터·정렬 바 ═══ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bt-border bg-bt-bg px-4 py-2.5 bt-shadow">
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
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: f.hex }} />
              {f.label} <span className="tabular-nums">{bucketCount[f.key]}</span>
            </button>
          );
        })}
        <span className="ml-1 text-[11px] text-bt-fg-muted">
          {rows.length} / {sys.total}대
        </span>
      </div>

      {/* ═══ 시스템 표 (ag-Grid) ═══ */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-bt-border bg-bt-bg bt-shadow">
        <NodeDetailGrid rows={rows} />
      </div>
    </div>
  );
}

// ─── KPI 타일 ──────────────────────────────────────────────────

function StatTile({
  label,
  sub,
  value,
  sev,
  hex,
  icon,
  pulse,
  blackValue,
}: {
  label: string;
  sub?: string;
  value: number;
  sev?: Severity;
  hex?: string;
  icon?: ReactNode;
  pulse?: boolean;
  blackValue?: boolean;
}) {
  // 상단 액센트 바는 hex/sev 색을 쓰되, blackValue 면 숫자는 기본 검정으로(액센트만 컬러).
  const accent = hex ? '' : sev ? SEV_BG[sev] : 'bg-bt-border-strong';
  const text = blackValue ? 'text-bt-fg' : hex ? '' : sev ? SEV_TEXT[sev] : 'text-bt-fg';
  const valueStyle = !blackValue && hex ? { color: hex } : undefined;
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-4 pt-3.5 pb-3 bt-shadow ${pulse ? 'bt-pulse-ring' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} style={hex ? { background: hex } : undefined} />
      <div className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-1.5">
        <span className={`text-[28px] font-extrabold leading-none tabular-nums ${text}`} style={valueStyle}>
          {value}
        </span>
        {sub && <span className="text-[11px] text-bt-fg-muted">{sub}</span>}
      </div>
    </div>
  );
}
