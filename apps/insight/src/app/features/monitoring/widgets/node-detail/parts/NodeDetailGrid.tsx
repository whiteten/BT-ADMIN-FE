import { useMemo } from 'react';
import type { CellStyle, ColDef, GetRowIdParams, RowStyle, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { STATUS_META, fmtUpdateTime } from '../helpers';
import type { ResourceStat, SystemNode } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 노드 상세 표(목록) 뷰 — 시안(08-node-detail.html)의 시스템 표를 ag-Grid 로 이식.
 *
 * 컬럼: 시스템 · CPU · MEM · DISK · PCS · 모듈 · 갱신
 *  - 시스템 상태는 STATUS(0~3) 만으로 표기 — 좌측 severity 바·행 tint 는 getRowStyle 로 인코딩(녹/amber/red).
 *  - 모듈은 상태 나쁜 순으로 왼쪽부터, dot 은 모듈 STATUS 색.
 */
export interface NodeDetailGridProps {
  /** 상위 위젯에서 칩·위험만 필터와 위험순 정렬을 적용한 visible row. */
  rows: SystemNode[];
}

// ─── 셀 렌더러 ─────────────────────────────────────────────────

/** 시스템 — LED dot + 이름 + (위험 시) 상태 배지. */
function SystemRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const m = STATUS_META[d.status];
  const danger = d.status >= 2;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${danger ? 'bt-pulse' : ''}`} style={{ background: m.hex, boxShadow: `0 0 6px ${m.hex}` }} />
      <span className="truncate font-bold" title={d.systemName}>
        {d.systemName}
      </span>
      {danger && <span className="shrink-0 text-[10px] font-semibold text-bt-danger">{d.status === 3 ? '위험' : '경고'}</span>}
    </span>
  );
}

/**
 * 자원(CPU/MEM/DISK) — 풀셀 그라디언트 퍼센트 바 + 가운데 % (공용 percentBarRenderer 와 동일 룩).
 * 단, 색은 사용율 임계가 아니라 서버 STATUS(0~3) 기준으로 칠한다(자원은 높을수록 위험이라 값-기준 색이 부적합).
 */
function makeResRenderer(key: 'cpu' | 'mem' | 'disk') {
  return function ResRenderer(props: { data?: SystemNode }) {
    const d = props.data;
    if (!d) return null;
    const stat: ResourceStat = d[key];
    const hex = STATUS_META[stat.status].hex;
    const pct = Math.max(0, Math.min(100, stat.rate));
    return (
      <div className="relative h-[20px] w-full overflow-hidden rounded" style={{ backgroundColor: `${hex}1A` }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hex}bb, ${hex})` }} />
        <span
          className="absolute inset-0 flex select-none items-center justify-center text-[11px] font-semibold tabular-nums"
          style={{ color: '#334155', textShadow: '0 0 6px #fff, 0 0 3px #fff' }}
        >
          {pct}%
        </span>
      </div>
    );
  };
}

/**
 * PCS — 가동/전체 프로세스. 분자=PCS_COUNT(가동) / 분모=PCS_TOT_COUNT(전체).
 * 단일 히트셀: 셀 배경을 PCS_STATUS(0~3) 상태색의 소프트 톤으로 칠하고 가운데 '가동/전체'.
 * (CPU/MEM/DISK 바와 동일한 STATUS 색 기준·높이로 통일.)
 */
function PcsRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const { running, total, status } = d.process;
  const hex = STATUS_META[status].hex;
  return (
    <div className="flex h-[20px] w-full items-center justify-center rounded text-[11px] font-semibold tabular-nums" style={{ background: `${hex}1A`, color: hex }}>
      {running}/{total}
    </div>
  );
}

/** 모듈 — 상태 나쁜(STATUS 높은) 순으로 왼쪽부터. dot 은 모듈 STATUS 색(위험은 pulse). */
function ModulesRenderer(props: { data?: SystemNode }) {
  const d = props.data;
  if (!d) return null;
  const modules = [...d.modules].sort((a, b) => b.status - a.status);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1">
      {modules.map((mod) => {
        const m = STATUS_META[mod.status];
        const bad = mod.status >= 2;
        const name = mod.name ?? mod.code;
        return (
          <span key={mod.code} className="inline-flex items-center gap-1 text-[10.5px] text-bt-fg" title={`${name}${mod.name ? ` (${mod.code})` : ''} · ${m.label}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${bad ? 'bt-pulse' : ''}`} style={{ background: m.hex }} />
            {name}
          </span>
        );
      })}
    </span>
  );
}

const updateTimeFormatter = (p: ValueFormatterParams) => fmtUpdateTime(p.value);

/** 값(바·배지·시각)을 셀 가운데 정렬 — 헤더 'header-center' 와 짝. */
const CENTER_CELL: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/** 행 좌측 severity 바 + 위험 tint (STATUS 기준). */
function getRowStyle(p: { data?: SystemNode }): RowStyle | undefined {
  const d = p.data;
  if (!d) return undefined;
  if (d.status >= 2) return { borderLeft: `4px solid ${STATUS_META[d.status].hex}`, background: 'rgba(201,42,42,0.04)' };
  if (d.status === 1) return { borderLeft: '4px solid #b76e00' };
  return { borderLeft: '4px solid #0a8a4a' };
}

export default function NodeDetailGrid({ rows }: NodeDetailGridProps) {
  const { gridOptions } = useAggridOptions();

  const columnDefs = useMemo<ColDef<SystemNode>[]>(
    () => [
      { headerName: '시스템', minWidth: 150, flex: 1.3, valueGetter: (p) => p.data?.systemName, cellRenderer: SystemRenderer },
      {
        headerName: 'CPU',
        width: 110,
        minWidth: 90,
        flex: 0,
        headerClass: 'header-center',
        cellStyle: CENTER_CELL,
        valueGetter: (p) => p.data?.cpu.rate ?? 0,
        cellRenderer: makeResRenderer('cpu'),
      },
      {
        headerName: 'MEM',
        width: 110,
        minWidth: 90,
        flex: 0,
        headerClass: 'header-center',
        cellStyle: CENTER_CELL,
        valueGetter: (p) => p.data?.mem.rate ?? 0,
        cellRenderer: makeResRenderer('mem'),
      },
      {
        headerName: 'DISK',
        width: 110,
        minWidth: 90,
        flex: 0,
        headerClass: 'header-center',
        cellStyle: CENTER_CELL,
        valueGetter: (p) => p.data?.disk.rate ?? 0,
        cellRenderer: makeResRenderer('disk'),
      },
      {
        headerName: 'PCS',
        width: 96,
        minWidth: 80,
        flex: 0,
        headerClass: 'header-center',
        cellStyle: CENTER_CELL,
        valueGetter: (p) => p.data?.process.running ?? 0,
        cellRenderer: PcsRenderer,
      },
      { headerName: '모듈', minWidth: 170, flex: 1.7, sortable: false, autoHeight: true, valueGetter: (p) => p.data?.modules.length ?? 0, cellRenderer: ModulesRenderer },
      { headerName: '갱신', width: 160, minWidth: 140, flex: 0, headerClass: 'header-center', cellStyle: CENTER_CELL, field: 'updateTime', valueFormatter: updateTimeFormatter },
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
        rowNumbers={false}
        onFirstDataRendered={(p) => p.api.autoSizeAllColumns()}
      />
    </div>
  );
}
