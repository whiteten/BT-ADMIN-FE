import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Tag } from 'antd';
import { toNum, toStr } from '../helpers';
import { ENTRY_PATH_LABELS, INOUT_KIND_LABELS, MEDIA_TYPE_LABELS, channelStatusMeta } from '../statusMap';
import type { ChannelRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 채널 목록(표) 뷰 — AS-IS `sleeSipSystemChannelStatus.jsp` datagrid 컬럼을 ag-Grid 로 이식.
 * 대규모(시스템당 수천 채널)는 SSRM 전환 여지가 있으나, 한 시스템 단위라 ClientSide 로 충분.
 */
export interface ChannelStatusGridProps {
  rows: ChannelRow[];
}

interface GridRow {
  id: string;
  chnlNo: number;
  status: number | null;
  statusLabel: string;
  statusHex: string;
  inout: string;
  media: string;
  entry: string;
  ani: string;
  dnis: string;
  ucid: string;
  svc: string;
}

function StatusTagRenderer(props: { data?: GridRow }) {
  const d = props.data;
  if (!d) return null;
  return (
    <Tag bordered={false} style={{ color: '#fff', background: d.statusHex }}>
      {d.statusLabel}
    </Tag>
  );
}

export default function ChannelStatusGrid({ rows }: ChannelStatusGridProps) {
  const { gridOptions } = useAggridOptions();

  const rowData = useMemo<GridRow[]>(
    () =>
      rows.map((r, i) => {
        const status = toNum(r.CHNL_STATUS);
        const meta = channelStatusMeta(status);
        const inout = toNum(r.INOUT_KIND);
        return {
          id: `${toStr(r.SYSTEM_ID)}_${toStr(r.CHNL_NO) || i}`,
          chnlNo: toNum(r.CHNL_NO) ?? 0,
          status,
          statusLabel: meta.label,
          statusHex: meta.hex,
          inout: inout != null ? (INOUT_KIND_LABELS[inout] ?? '—') : '—',
          media: MEDIA_TYPE_LABELS[toNum(r.MEDIA_TYPE) ?? -1] ?? '—',
          entry: ENTRY_PATH_LABELS[toNum(r.ENTRY_PATH) ?? -1] ?? '—',
          ani: toStr(r.SERVICE_ANI) || '—',
          dnis: toStr(r.SERVICE_DNIS) || '—',
          ucid: toStr(r.UCID) || '—',
          svc: toStr(r.SERVICE_ID) || '—',
        };
      }),
    [rows],
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      { field: 'chnlNo', headerName: 'CHNL_NO', minWidth: 100, type: 'numericColumn', cellClass: 'font-mono font-bold' },
      { field: 'statusLabel', headerName: '상태', minWidth: 96, cellRenderer: StatusTagRenderer },
      { field: 'inout', headerName: '방향', minWidth: 80, cellClass: 'font-mono' },
      { field: 'media', headerName: '미디어', minWidth: 90 },
      { field: 'entry', headerName: '진입경로', minWidth: 110 },
      { field: 'ani', headerName: 'SERVICE_ANI', minWidth: 150, cellClass: 'font-mono' },
      { field: 'dnis', headerName: 'SERVICE_DNIS', minWidth: 150, cellClass: 'font-mono' },
      { field: 'ucid', headerName: 'UCID', minWidth: 150, cellClass: 'font-mono', flex: 1 },
      { field: 'svc', headerName: 'SVC', minWidth: 80, type: 'rightAligned', cellClass: 'font-mono' },
    ],
    [],
  );

  return (
    <div className="h-full w-full">
      <AgGridReact<GridRow> {...gridOptions} rowData={rowData} columnDefs={columnDefs} getRowId={(p) => p.data.id} pagination={false} />
    </div>
  );
}
