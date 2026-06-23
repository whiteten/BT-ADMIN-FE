import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Play, Search, Square } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import BotRealtimeDetailDrawer, { type BotRealtimeDetailDrawerRef } from '../../features/tracking/components/BotRealtimeDetailDrawer';
import { useBotRealtimeSocket } from '../../features/tracking/hooks/useBotRealtimeSocket';
import type { TrackingSession } from '../../features/tracking/types';
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
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function BotRealtime() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

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
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
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
            <Button
              color={isPlaying ? 'red' : 'green'}
              variant="solid"
              icon={isPlaying ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              onClick={isPlaying ? disconnect : connect}
            >
              {isPlaying ? '중지' : '시작'}
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<TrackingSession>
            rowModelType="clientSide"
            rowData={filteredSessions}
            getRowId={(params) => `${params.data.ucid}-${params.data.nexthop}`}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            onRowDoubleClicked={handleRowDoubleClicked}
          />
        </div>
      </div>
      <BotRealtimeDetailDrawer ref={drawerRef} sseDetail={sessionDetail} onClose={clearSessionDetail} onSend={send} />
    </div>
  );
}
