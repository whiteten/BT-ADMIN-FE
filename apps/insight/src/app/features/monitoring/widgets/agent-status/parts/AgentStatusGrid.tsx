import { useMemo } from 'react';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Tag } from 'antd';
import { answerRatePct, formatDuration, liveDurationSec, serviceLevelPct, toNum, toStr } from '../helpers';
import { agentStatusLabel, statusMeta } from '../statusMap';
import type { AgentRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 상담사 상태 그리드(목록) 뷰 — 레거시 `agentStatus.jsp` 의 datagrid 컬럼을 ag-Grid 로 이식.
 *
 * JSP 기본 노출 컬럼(hiddenColumnsWithAgGrid 제외)만 표시:
 *   상담그룹 · 상담사명 · 로그인ID · DN번호 · 상태 · 상태유지시간
 *   · IB인입 · IB응답 · IB포기 · IB거부 · IB통화시간 · OB통화시간 · 응대율 · 서비스레벨
 */
export interface AgentStatusGridProps {
  /** 상위 위젯에서 칩 필터·검색·정렬을 적용한 가시 row. */
  rows: AgentRow[];
  /** 상태유지시간 실시간 계산 기준 시각 (ms). */
  nowMs: number;
  /** 이석 사유명 맵 (`{tenantId}_{reasonCode}` → 사유명). */
  reasonNames?: Record<string, string>;
}

/** statusMeta.group → antd Tag 색상 (AgentCard 와 동일 매핑). */
const TAG_COLOR_BY_GROUP: Record<string, string> = {
  available: 'green',
  talking: 'blue',
  ringing: 'orange',
  wrapup: 'purple',
  offline: 'default',
};

interface GridRow {
  id: string;
  agentStatus?: number | string;
  reasonCode?: number | string;
  groupName: string;
  agentName: string;
  loginId: string;
  dn: string;
  statusName: string;
  /** 상태유지시간(초). 로그아웃은 null → '—'. */
  durationSec: number | null;
  connCnt: number;
  answCnt: number;
  abdnCnt: number;
  denyCnt: number;
  ibTalk: number;
  obTalk: number;
  answerRate: number | null;
  svcLevel: number | null;
}

/** 상태 셀 — 시맨틱 그룹 색상의 Tag. */
function StatusTagRenderer(props: { data?: GridRow }) {
  const d = props.data;
  if (!d) return null;
  const meta = statusMeta(d.agentStatus, d.reasonCode);
  return <Tag color={TAG_COLOR_BY_GROUP[meta.group]}>{d.statusName}</Tag>;
}

const durationFormatter = (p: ValueFormatterParams) => {
  const n = toNum(p.value);
  return n != null && n > 0 ? formatDuration(n) : '—';
};

const percentFormatter = (p: ValueFormatterParams) => (p.value == null ? '—' : `${p.value}%`);

export default function AgentStatusGrid({ rows, nowMs, reasonNames }: AgentStatusGridProps) {
  const { gridOptions } = useAggridOptions();

  const rowData = useMemo<GridRow[]>(
    () =>
      rows.map((r, i) => {
        const isOffline = toNum(r.AGENT_STATUS) === 10;
        const id = `${toStr(r.GROUP_ID)}_${toStr(r.AGENT_ID) || toStr(r.AGENT_LOGIN_ID) || i}_${toStr(r.MEDIA_TYPE)}`;
        return {
          id,
          agentStatus: r.AGENT_STATUS,
          reasonCode: r.REASON_CODE,
          groupName: toStr(r.GROUP_NAME),
          agentName: toStr(r.AGENT_NAME) || toStr(r.AGENT_LOGIN_ID),
          loginId: toStr(r.AGENT_LOGIN_ID),
          dn: toStr(r.LOGIN_DN_NO),
          statusName: agentStatusLabel(r.AGENT_STATUS, r.REASON_CODE, r.TENANT_ID, reasonNames),
          durationSec: isOffline ? null : liveDurationSec(r, nowMs),
          connCnt: toNum(r.SUM_CONN_CNT) ?? 0,
          answCnt: toNum(r.SUM_ANSW_CNT) ?? 0,
          abdnCnt: toNum(r.SUM_ABDN_CNT) ?? 0,
          denyCnt: toNum(r.SUM_DENY_CNT) ?? 0,
          ibTalk: toNum(r.SUM_IB_TALKTIME) ?? 0,
          obTalk: toNum(r.SUM_OB_TALKTIME) ?? 0,
          answerRate: answerRatePct(r),
          svcLevel: serviceLevelPct(r),
        };
      }),
    [rows, nowMs, reasonNames],
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      { field: 'groupName', headerName: '상담그룹', minWidth: 120 },
      { field: 'agentName', headerName: '상담사명', minWidth: 100 },
      { field: 'loginId', headerName: '로그인ID', minWidth: 100 },
      { field: 'dn', headerName: 'DN번호', minWidth: 90, type: 'rightAligned' },
      { field: 'statusName', headerName: '상태', minWidth: 110, cellRenderer: StatusTagRenderer },
      { field: 'durationSec', headerName: '상태유지시간', minWidth: 110, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'connCnt', headerName: 'IB인입', type: 'numericColumn', minWidth: 90 },
      { field: 'answCnt', headerName: 'IB응답', type: 'numericColumn', minWidth: 90 },
      { field: 'abdnCnt', headerName: 'IB포기', type: 'numericColumn', minWidth: 90 },
      { field: 'denyCnt', headerName: 'IB거부', type: 'numericColumn', minWidth: 90 },
      { field: 'ibTalk', headerName: 'IB통화시간', minWidth: 110, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'obTalk', headerName: 'OB통화시간', minWidth: 110, type: 'rightAligned', valueFormatter: durationFormatter },
      { field: 'answerRate', headerName: '응대율', type: 'numericColumn', minWidth: 90, valueFormatter: percentFormatter },
      { field: 'svcLevel', headerName: '서비스레벨', type: 'numericColumn', minWidth: 90, valueFormatter: percentFormatter },
    ],
    [],
  );

  return (
    <div className="h-full w-full">
      <AgGridReact<GridRow> {...gridOptions} rowData={rowData} columnDefs={columnDefs} getRowId={(p) => p.data.id} pagination={false} />
    </div>
  );
}
