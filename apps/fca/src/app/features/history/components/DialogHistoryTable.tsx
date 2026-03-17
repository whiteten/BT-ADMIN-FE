import React, { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import type { DialogHistoryListItem } from '../types/history.types';
import ServerPagination from '@/components/custom/ServerPagination';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DialogHistoryTableProps {
  rowData: DialogHistoryListItem[];
  total: number;
  isLoading?: boolean;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onRowClick: (data: DialogHistoryListItem) => void;
  selectedRowId?: string;
}

const DialogHistoryTable: React.FC<DialogHistoryTableProps> = ({ rowData, total, isLoading, page, size, onPageChange, onRowClick, selectedRowId }) => {
  const { gridOptions } = useAggridOptions();

  const columnDefs: ColDef<DialogHistoryListItem>[] = useMemo(
    () => [
      {
        headerName: '시작일시',
        field: 'svcStartTime',
        flex: 1.5,
        valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
        sort: 'desc',
      },
      {
        headerName: '봇서비스',
        field: 'serviceName',
        flex: 1.5,
      },
      {
        headerName: '발신번호(ANI)',
        field: 'ani',
        flex: 1.2,
      },
      {
        headerName: 'UCID',
        field: 'ucid',
        flex: 2,
      },
      {
        headerName: '완결여부',
        field: 'serviceCompleteYn',
        width: 100,
        cellRenderer: (params: any) => {
          const val = params.value;
          return <span className={val === 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>{val === 1 ? '완결' : '미완결'}</span>;
        },
      },
      {
        headerName: '상담사연결',
        field: 'reqAgentYn',
        width: 110,
        cellRenderer: (params: any) => {
          const val = params.value;
          return <span className={val === 1 ? 'text-red-500 font-medium' : 'text-gray-500'}>{val === 1 ? '연결' : '미연결'}</span>;
        },
      },
      {
        headerName: '대화수',
        field: 'dialogCount',
        width: 90,
        cellClass: 'text-right',
        valueFormatter: (params) => params.value?.toLocaleString() ?? '0',
      },
      {
        headerName: '통화시간(초)',
        field: 'durationSec',
        width: 110,
        cellClass: 'text-right',
        valueFormatter: (params) => params.value?.toLocaleString() ?? '0',
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white bt-shadow">
      <div className="flex-1 w-full overflow-hidden">
        <AgGridReact<DialogHistoryListItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            onRowClicked: (event) => event.data && onRowClick(event.data),
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

export default DialogHistoryTable;
