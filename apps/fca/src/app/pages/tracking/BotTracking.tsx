import { useRef } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { BreadcrumbProps } from 'antd';
import TrackingDetailDrawer, { type TrackingDetailDrawerRef } from '../../features/tracking/components/TrackingDetailDrawer';
import { useTrackingSse } from '../../features/tracking/hooks/useTrackingSse';
import type { TrackingSession } from '../../features/tracking/types/tracking.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '실시간 봇 트래킹', path: '/fca/tracking/realtime' },
];

function formatCallTime(callTime: string): string {
  if (!callTime || callTime.length < 6) return '-';
  return `${callTime.slice(0, 2)}:${callTime.slice(2, 4)}:${callTime.slice(4, 6)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function BotTracking() {
  const { gridOptions } = useAggridOptions();
  const drawerRef = useRef<TrackingDetailDrawerRef>(null);
  const { sessions, connected, sessionDetail, clearSessionDetail } = useTrackingSse();

  const columnDefs: ColDef<TrackingSession>[] = [
    { headerName: '시나리오명', field: 'serviceName', flex: 1.5, minWidth: 140 },
    { headerName: '발신번호', field: 'ani', flex: 1.2, minWidth: 130 },
    { headerName: '착신번호', field: 'dnis', flex: 1, minWidth: 100 },
    {
      headerName: '통화시작',
      field: 'callTime',
      flex: 1,
      minWidth: 100,
      valueFormatter: ({ value }) => formatCallTime(value as string),
    },
    {
      headerName: '통화시간',
      field: 'duration',
      flex: 0.8,
      minWidth: 90,
      valueFormatter: ({ value }) => (typeof value === 'number' ? formatDuration(value) : '-'),
    },
    { headerName: '봇 대화', field: 'botDialog', flex: 2, minWidth: 180 },
    { headerName: '봇 슬롯', field: 'botSlot', flex: 1.2, minWidth: 120 },
  ];

  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<TrackingSession>) => {
    const data = event.data;
    if (!data) return;
    drawerRef.current?.open({
      ucid: data.ucid,
      nexthop: data.nexthop,
      systemId: data.systemId,
      sleeChno: data.sleeChno,
      nodeId: data.nodeId,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* SSE 연결 상태 */}
      <div className="flex items-center gap-2 px-1">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-500">{connected ? '실시간 연결됨' : '연결 끊김 (재연결 중...)'}</span>
      </div>

      {/* ag-Grid 테이블 */}
      <div className="flex flex-col w-full flex-1 bg-white bt-shadow p-5">
        <AgGridReact<TrackingSession>
          rowModelType="clientSide"
          rowData={sessions}
          getRowId={(params) => `${params.data.ucid}-${params.data.nexthop}`}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          onRowDoubleClicked={handleRowDoubleClicked}
        />
      </div>

      <TrackingDetailDrawer ref={drawerRef} sseDetail={sessionDetail} onClose={clearSessionDetail} />
    </div>
  );
}
