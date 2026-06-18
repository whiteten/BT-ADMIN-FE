import { useMemo } from 'react';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Tag } from 'antd';
import { toNum, toStr } from '../helpers';
import { SEVERITY_META } from '../statusMap';
import type { CtiqRow, CtiqSeverity } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 큐 상태 표(목록) 뷰 — 레거시 `ctiqStatus.jsp` datagrid 컬럼을 ag-Grid 로 이식.
 *
 * 15 컬럼:
 *   ID · 큐명 · 상태 · 대기 · 최장대기 · EWT
 *   · 인입 · 응대 · 포기 · 포기율 · SLA · 응대율
 *   · 평균통화 · 평균대기 · 로그인
 */
export interface CtiqStatusGridProps {
  /** 상위 위젯에서 칩·검색·임계 필터를 적용한 visible row (sev 분류 포함). */
  classified: { row: CtiqRow; sev: CtiqSeverity }[];
}

interface GridRow {
  id: string;
  sev: CtiqSeverity;
  ctiqId: string;
  ctiqName: string;
  sevLabel: string;
  waitCnt: number;
  maxWaitSec: number;
  ewtSec: number;
  conn: number;
  answered: number;
  abdn: number;
  abdnRatio: number | null;
  sla: number | null;
  answerRate: number | null;
  avgTalk: number;
  avgWait: number;
  loginAgt: number;
}

function StatusTagRenderer(props: { data?: GridRow }) {
  const d = props.data;
  if (!d) return null;
  const meta = SEVERITY_META[d.sev];
  return <Tag color={meta.tagColor}>{meta.label}</Tag>;
}

function durationFormatter(p: ValueFormatterParams) {
  const n = toNum(p.value);
  if (n == null || n <= 0) return '—';
  const s = Math.floor(n);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

function percentFormatter(p: ValueFormatterParams) {
  const n = toNum(p.value);
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function countFormatter(p: ValueFormatterParams) {
  const n = toNum(p.value);
  if (n == null) return '—';
  return n.toLocaleString();
}

export default function CtiqStatusGrid({ classified }: CtiqStatusGridProps) {
  const { gridOptions } = useAggridOptions();

  const rowData = useMemo<GridRow[]>(
    () =>
      classified.map(({ row, sev }, i) => {
        const id = `${toStr(row.CTIQ_ID) || toStr(row.GDN_NO) || i}_${toStr(row.MEDIA_TYPE)}`;
        return {
          id,
          sev,
          ctiqId: toStr(row.CTIQ_ID) || toStr(row.GDN_NO) || '—',
          ctiqName: toStr(row.CTIQ_NAME) || '(이름 없음)',
          sevLabel: SEVERITY_META[sev].label,
          waitCnt: toNum(row.RTS_WAIT_CNT) ?? 0,
          maxWaitSec: toNum(row.RTS_MAXWAIT_TIME) ?? 0,
          ewtSec: toNum(row.KPI_EWT_TIME) ?? 0,
          conn: toNum(row.SUM_CONN_CNT) ?? 0,
          answered: toNum(row.SUM_ANSWER_CNT_TOT) ?? toNum(row.SUM_ANSWER_CNT) ?? 0,
          abdn: toNum(row.SUM_ABDN_CNT) ?? 0,
          abdnRatio: toNum(row.KPI_ABANDON_RATIO),
          sla: toNum(row.KPI_SVCLEVEL),
          answerRate: toNum(row.KPI_ANSWER_RATE),
          avgTalk: toNum(row.AVG_ANSTALK_TIME) ?? 0,
          avgWait: toNum(row.AVG_ANSWAIT_TIME) ?? 0,
          loginAgt: toNum(row.RTS_EXP_LOGIN_AGT) ?? 0,
        };
      }),
    [classified],
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      { field: 'ctiqId', headerName: 'ID', minWidth: 80, cellClass: 'font-mono' },
      { field: 'ctiqName', headerName: '큐명', minWidth: 160 },
      { field: 'sevLabel', headerName: '상태', minWidth: 90, cellRenderer: StatusTagRenderer },
      { field: 'waitCnt', headerName: '대기', minWidth: 80, type: 'numericColumn', valueFormatter: countFormatter },
      { field: 'maxWaitSec', headerName: '최장대기', minWidth: 100, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'ewtSec', headerName: 'EWT', minWidth: 90, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'conn', headerName: '인입', minWidth: 90, type: 'numericColumn', valueFormatter: countFormatter },
      { field: 'answered', headerName: '응대', minWidth: 90, type: 'numericColumn', valueFormatter: countFormatter },
      { field: 'abdn', headerName: '포기', minWidth: 80, type: 'numericColumn', valueFormatter: countFormatter },
      { field: 'abdnRatio', headerName: '포기율', minWidth: 90, type: 'numericColumn', valueFormatter: percentFormatter },
      { field: 'sla', headerName: 'SLA', minWidth: 90, type: 'numericColumn', valueFormatter: percentFormatter },
      { field: 'answerRate', headerName: '응대율', minWidth: 90, type: 'numericColumn', valueFormatter: percentFormatter },
      { field: 'avgTalk', headerName: '평균통화', minWidth: 100, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'avgWait', headerName: '평균대기', minWidth: 100, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'loginAgt', headerName: '로그인', minWidth: 80, type: 'numericColumn', valueFormatter: countFormatter },
    ],
    [],
  );

  return (
    <div className="h-full w-full">
      <AgGridReact<GridRow> {...gridOptions} rowData={rowData} columnDefs={columnDefs} getRowId={(p) => p.data.id} pagination={false} />
    </div>
  );
}
