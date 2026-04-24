import { useMemo, useRef, useState } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Input } from 'antd';
import { Play, Search, Square } from 'lucide-react';
import BotRealtimeDetailDrawer, { type BotRealtimeDetailDrawerRef } from '../../features/tracking/components/BotRealtimeDetailDrawer';
import { useBotRealtimeSocket } from '../../features/tracking/hooks/useBotRealtimeSocket';
import type { TrackingSession } from '../../features/tracking/types/tracking.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '실시간 봇 트래킹', path: '/fca/tracking/bot-realtime' },
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

export default function BotRealtime() {
  const { gridOptions } = useAggridOptions();
  const drawerRef = useRef<BotRealtimeDetailDrawerRef>(null);
  const { sessions, connected, isPlaying, connect, disconnect, sessionDetail, clearSessionDetail, send } = useBotRealtimeSocket();
  const [aniSearch, setAniSearch] = useState('');

  const filteredSessions = useMemo(() => {
    if (!aniSearch) return sessions;
    return sessions.filter((s) => s.ani?.includes(aniSearch));
  }, [sessions, aniSearch]);

  const columnDefs: ColDef<TrackingSession>[] = [
    { headerName: '봇', field: 'serviceName', flex: 1.5, minWidth: 140 },
    { headerName: 'UCID', field: 'ucid', flex: 1.5, minWidth: 150 },
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

      {/* 검색조건 + 연결 상태 + Play/Stop 버튼 */}
      <div className="flex items-center justify-between gap-3 bg-white bt-shadow px-7 py-5 h-[76px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">발신번호</span>
          <Input
            placeholder="발신번호 검색"
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={aniSearch}
            onChange={(e) => setAniSearch(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
        </div>
        <div className="flex items-center gap-3">
          {isPlaying && <span className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />}
          <button
            type="button"
            onClick={isPlaying ? disconnect : connect}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" />
                중지
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                시작
              </>
            )}
          </button>
        </div>
      </div>

      {/* ag-Grid 테이블 */}
      <div className="flex flex-col w-full flex-1 bg-white bt-shadow p-5">
        <AgGridReact<TrackingSession>
          rowModelType="clientSide"
          rowData={filteredSessions}
          getRowId={(params) => `${params.data.ucid}-${params.data.nexthop}`}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          onRowDoubleClicked={handleRowDoubleClicked}
        />
      </div>

      <BotRealtimeDetailDrawer ref={drawerRef} sseDetail={sessionDetail} onClose={clearSessionDetail} onSend={send} />
    </div>
  );
}
