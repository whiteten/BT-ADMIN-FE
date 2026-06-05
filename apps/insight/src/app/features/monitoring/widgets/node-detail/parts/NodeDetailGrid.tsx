import { useMemo } from 'react';
import type { ColDef, GetRowIdParams, RowStyle, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { STATUS_META, fmtUpdateTime, moduleRedundancy } from '../helpers';
import type { ResourceStat, SystemNode } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 노드 상세 표(목록) 뷰 — 시안(08-node-detail.html)의 시스템 표를 ag-Grid 로 이식.
 *
 * 컬럼: 시스템 · 유형 · 가동 · CPU · MEM · DISK · PCS · 모듈(이중화) · 갱신
 *  - 좌측 severity 바·행 tint 는 getRowStyle 로 인코딩(녹/amber/red, 다운=red).
 *  - 다운 시스템은 자원·프로세스가 stale → CPU 셀이 3칸(CPU/MEM/DISK)을 colSpan 으로 병합해 안내.
 *  - 모듈 dot: Active=꽉찬 dot / Standby=링 dot + 행 끝 A n·S m 롤업.
 */
export interface NodeDetailGridProps {
  /** 상위 위젯에서 칩·위험만 필터와 위험순 정렬을 적용한 visible row. */
  rows: SystemNode[];
}

const DANGER = '#c92a2a';

// ─── 셀 렌더러 ─────────────────────────────────────────────────

/** 시스템 — LED dot + 이름 + (위험 시) 상태 배지. */
function SystemRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const down = !d.isAlive;
  const m = STATUS_META[d.status];
  const danger = !down && d.status >= 2;
  const ledHex = down ? DANGER : m.hex;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${down || danger ? 'bt-pulse' : ''}`} style={{ background: ledHex, boxShadow: `0 0 6px ${ledHex}` }} />
      <span className="truncate font-bold" title={d.systemName}>
        {d.systemName}
      </span>
      {danger && <span className="shrink-0 text-[10px] font-semibold text-bt-danger">{d.status === 3 ? 'Crit' : 'Major'}</span>}
    </span>
  );
}

/** 가동/다운 — 생존 여부 태그(이중화 아님). */
function AliveRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const down = !d.isAlive;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${down ? 'text-bt-danger' : 'text-bt-success'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${down ? 'bg-bt-danger bt-pulse' : 'bg-bt-success'}`} />
      {down ? '다운' : '가동'}
    </span>
  );
}

/** 자원(CPU/MEM/DISK) — 미니 바 + 상태색 값. 다운이면 CPU 셀이 3칸 병합 stale 안내. */
function makeResRenderer(key: 'cpu' | 'mem' | 'disk') {
  return function ResRenderer(props: { data?: SystemNode }) {
    const d = props.data;
    if (!d) return null;
    if (!d.isAlive) {
      // colSpan(3) 으로 CPU 셀만 렌더 — MEM/DISK 셀은 병합되어 호출되지 않음.
      return key === 'cpu' ? <span className="text-[10.5px] italic text-bt-fg-muted opacity-60">자원·프로세스 보고 중단 (stale)</span> : null;
    }
    const stat: ResourceStat = d[key];
    const hex = STATUS_META[stat.status].hex;
    const pct = Math.max(0, Math.min(100, stat.rate));
    return (
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bt-bg-muted">
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: hex }} />
        </span>
        <b className={`w-6 shrink-0 text-right tabular-nums ${stat.status >= 1 ? '' : 'text-bt-fg-muted'}`} style={stat.status >= 1 ? { color: hex } : undefined}>
          {pct}
        </b>
      </span>
    );
  };
}

/** PCS — 실행/전체 프로세스. */
function PcsRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const down = !d.isAlive;
  return (
    <span className={`tabular-nums ${down ? 'text-bt-fg-muted opacity-60' : ''}`}>
      <b style={down ? undefined : { color: STATUS_META[d.process.status].hex }}>{d.process.running}</b>
      <span className="text-bt-fg-muted">/{d.process.total}</span>
    </span>
  );
}

/** 모듈(이중화) — Active 꽉찬 dot / Standby 링 dot + A n·S m 롤업. */
function ModulesRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const redund = moduleRedundancy(d);
  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1 ${d.isAlive ? '' : 'opacity-50'}`}>
      {d.modules.map((mod) => {
        const m = STATUS_META[mod.status];
        const bad = mod.status >= 2;
        const standby = !mod.isActive;
        return (
          <span
            key={mod.code}
            className={`inline-flex items-center gap-1 text-[10.5px] ${standby ? 'text-bt-fg-muted' : 'text-bt-fg'}`}
            title={`${mod.code} · ${m.label} · ${standby ? 'Standby' : 'Active'}`}
          >
            {standby ? (
              <span className={`h-2 w-2 shrink-0 rounded-full border-[1.5px] bg-transparent ${bad ? 'bt-pulse' : ''}`} style={{ borderColor: m.hex }} />
            ) : (
              <span className={`h-2 w-2 shrink-0 rounded-full ${bad ? 'bt-pulse' : ''}`} style={{ background: m.hex }} />
            )}
            {mod.code}
          </span>
        );
      })}
      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-bt-fg-muted" title="모듈 이중화 — Active / Standby">
        A {redund.active}·S {redund.standby}
      </span>
    </span>
  );
}

const updateTimeFormatter = (p: ValueFormatterParams) => fmtUpdateTime(p.value);

/** 행 좌측 severity 바 + 위험/다운 tint. */
function getRowStyle(p: { data?: SystemNode }): RowStyle | undefined {
  const d = p.data;
  if (!d) return undefined;
  if (!d.isAlive) return { borderLeft: `4px solid ${DANGER}`, background: 'rgba(201,42,42,0.06)' };
  if (d.status >= 2) return { borderLeft: `4px solid ${DANGER}`, background: 'rgba(201,42,42,0.04)' };
  if (d.status === 1) return { borderLeft: '4px solid #b76e00' };
  return { borderLeft: '4px solid #0a8a4a' };
}

export default function NodeDetailGrid({ rows }: NodeDetailGridProps) {
  const { gridOptions } = useAggridOptions();

  const columnDefs = useMemo<ColDef<SystemNode>[]>(
    () => [
      { headerName: '시스템', minWidth: 150, flex: 1.3, valueGetter: (p) => p.data?.systemName, cellRenderer: SystemRenderer },
      { headerName: '유형', field: 'type', width: 80, minWidth: 64, flex: 0, valueFormatter: (p) => (p.value?.length ? p.value : '—') },
      { headerName: '가동', width: 84, minWidth: 70, flex: 0, valueGetter: (p) => (p.data?.isAlive ? 0 : 1), cellRenderer: AliveRenderer },
      {
        headerName: 'CPU',
        width: 110,
        minWidth: 90,
        flex: 0,
        headerClass: 'ag-right-aligned-header',
        valueGetter: (p) => p.data?.cpu.rate ?? 0,
        cellRenderer: makeResRenderer('cpu'),
        colSpan: (p) => (p.data && !p.data.isAlive ? 3 : 1),
      },
      {
        headerName: 'MEM',
        width: 110,
        minWidth: 90,
        flex: 0,
        headerClass: 'ag-right-aligned-header',
        valueGetter: (p) => p.data?.mem.rate ?? 0,
        cellRenderer: makeResRenderer('mem'),
      },
      {
        headerName: 'DISK',
        width: 110,
        minWidth: 90,
        flex: 0,
        headerClass: 'ag-right-aligned-header',
        valueGetter: (p) => p.data?.disk.rate ?? 0,
        cellRenderer: makeResRenderer('disk'),
      },
      { headerName: 'PCS', width: 84, minWidth: 70, flex: 0, type: 'rightAligned', valueGetter: (p) => p.data?.process.running ?? 0, cellRenderer: PcsRenderer },
      { headerName: '모듈 (이중화)', minWidth: 170, flex: 1.7, sortable: false, autoHeight: true, valueGetter: (p) => p.data?.modules.length ?? 0, cellRenderer: ModulesRenderer },
      { headerName: '갱신', width: 90, minWidth: 76, flex: 0, type: 'rightAligned', field: 'updateTime', valueFormatter: updateTimeFormatter },
    ],
    [],
  );

  return (
    <div className="h-full w-full">
      <AgGridReact<SystemNode>
        {...gridOptions}
        rowData={rows}
        columnDefs={columnDefs}
        getRowId={(p: GetRowIdParams<SystemNode>) => p.data.systemId}
        getRowStyle={getRowStyle}
        pagination={false}
      />
    </div>
  );
}
