import React, { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import type { BotDialogHistoryListItem } from '../types/botDialogHistory.types';
import ServerPagination from '@/components/custom/ServerPagination';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface BotDialogHistoryTableProps {
  rowData: BotDialogHistoryListItem[];
  total: number;
  isLoading?: boolean;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onRowDoubleClick: (data: BotDialogHistoryListItem) => void;
  selectedRowId?: string;
}

const BotDialogHistoryTable: React.FC<BotDialogHistoryTableProps> = ({ rowData, total, isLoading, page, size, onPageChange, onRowDoubleClick, selectedRowId }) => {
  const { gridOptions } = useAggridOptions();

  const columnDefs: ColDef<BotDialogHistoryListItem>[] = useMemo(
    () => [
      {
        headerName: '봇',
        field: 'serviceName',
        flex: 1.5,
      },
      {
        headerName: '발신번호',
        field: 'ani',
        flex: 1.2,
      },
      {
        headerName: '수신번호',
        field: 'dnis',
        flex: 1.2,
      },
      {
        headerName: '콜방향',
        field: 'callDirection',
        width: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: any) => {
          const val = params.value;
          if (val === 1)
            return (
              <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-[#3577F1] bg-[#3577F11A]">
                인바운드
              </Badge>
            );
          if (val === 2)
            return (
              <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-[#F7B84B] bg-[#F7B84B1A]">
                아웃바운드
              </Badge>
            );
          return '-';
        },
      },
      {
        headerName: '시작일시',
        field: 'svcStartTime',
        flex: 1.5,
        minWidth: 170,
        valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '종료일시',
        field: 'svcFinshTime',
        flex: 1.5,
        minWidth: 170,
        valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '통화시간',
        field: 'durationSec',
        width: 110,
        cellClass: 'text-right',
        valueFormatter: (params) => {
          const sec = params.value ?? 0;
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const s = sec % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        },
      },
      {
        headerName: '완결여부',
        field: 'serviceCompleteYn',
        width: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: any) => {
          const val = params.value;
          const isComplete = val === 1;
          return (
            <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${isComplete ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#495057] bg-[#E9EBEC]'}`}>
              {isComplete ? '완결' : '미완결'}
            </Badge>
          );
        },
      },
      {
        headerName: '상담사연결',
        field: 'reqAgentYn',
        width: 110,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: any) => {
          const val = params.value;
          const isConnected = val === 1;
          return (
            <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${isConnected ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#495057] bg-[#E9EBEC]'}`}>
              {isConnected ? '연결' : '미연결'}
            </Badge>
          );
        },
      },
      {
        headerName: 'UCID',
        field: 'ucid',
        flex: 2,
      },
      {
        headerName: '신뢰도',
        field: 'avgConfidence',
        width: 110,
        cellClass: 'text-right',
        valueFormatter: (params) => (params.value != null ? `${params.value}` : '-'),
      },
      {
        headerName: '총 봇 질의수',
        field: 'botSlotInCount',
        width: 90,
        cellClass: 'text-right',
        valueFormatter: (params) => params.value?.toLocaleString() ?? '0',
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white bt-shadow">
      <div className="flex-1 w-full overflow-hidden">
        <AgGridReact<BotDialogHistoryListItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            pagination: false,
            statusBar: undefined,
            rowStyle: { cursor: 'pointer' },
            onRowDoubleClicked: (event) => event.data && onRowDoubleClick(event.data),
            rowClassRules: {
              'bg-blue-50': (params) => {
                if (!selectedRowId || !params.data) return false;
                return `${params.data.ucid}_${params.data.nextHop}_${params.data.cdrPkey}` === selectedRowId;
              },
            },
          }}
          loading={isLoading}
        />
      </div>
      <ServerPagination totalItems={total} currentPage={page} pageSize={size} onPageChange={onPageChange} />
    </div>
  );
};

export default BotDialogHistoryTable;
