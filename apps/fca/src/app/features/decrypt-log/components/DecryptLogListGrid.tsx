import React, { useCallback, useMemo, useRef } from 'react';
import type { ColDef, FirstDataRenderedEvent, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { type DecryptLogItem, REASON_CODE_LABELS, RESULT_LABELS } from '../types/decryptLog.types';
import ServerPagination from '@/components/custom/ServerPagination';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DecryptLogListGridProps {
  rowData: DecryptLogItem[];
  total: number;
  isLoading?: boolean;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onDetailClick: (item: DecryptLogItem) => void;
  selectedLogId?: string;
}

/** 결과 코드별 배지 색상 */
const resultBadgeClass = (result: string): string => {
  switch (result) {
    case 'SUCCESS':
      return 'text-[#0AB39C] bg-[#0AB39C1A]';
    case 'DECRYPT_FAIL':
      return 'text-[#F06548] bg-[#F065481A]';
    case 'FORBIDDEN':
      return 'text-[#F7B84B] bg-[#F7B84B1A]';
    case 'NOT_FOUND':
      return 'text-[#878A99] bg-[#E9EBEC]';
    default:
      return 'text-[#495057] bg-[#E9EBEC]';
  }
};

/** 화자 역할 배지 색상 */
const dialogRoleBadgeClass = (role: string | null): string => {
  switch (role) {
    case 'BOT':
      return 'text-[#3577F1] bg-[#3577F11A]';
    case 'CUSTOMER':
      return 'text-[#0AB39C] bg-[#0AB39C1A]';
    default:
      return 'text-[#495057] bg-[#E9EBEC]';
  }
};

const DecryptLogListGrid: React.FC<DecryptLogListGridProps> = ({ rowData, total, isLoading, page, size, onPageChange, onDetailClick, selectedLogId }) => {
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<DecryptLogItem>>(null);

  const handleFirstDataRendered = useCallback((event: FirstDataRenderedEvent) => {
    event.api.autoSizeAllColumns();
  }, []);

  const columnDefs: ColDef<DecryptLogItem>[] = useMemo(
    () => [
      {
        headerName: '열람 시각',
        field: 'createdAt',
        width: 170,
        sort: 'desc',
        valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '결과',
        field: 'result',
        width: 110,
        cellClass: 'flex items-center',
        cellRenderer: (params: any) => {
          const v = params.value as string;
          return (
            <Badge variant="secondary" className={cn('text-[12px] leading-[12px] font-medium !h-6', resultBadgeClass(v))}>
              {RESULT_LABELS[v] ?? v}
            </Badge>
          );
        },
      },
      {
        headerName: '열람자',
        field: 'userName',
        width: 130,
        valueFormatter: (params) => params.value || params.data?.userAccount || '-',
        tooltipValueGetter: (params) => params.data?.userAccount ?? '',
      },
      {
        headerName: '봇 서비스',
        field: 'serviceName',
        flex: 1.3,
        minWidth: 140,
        valueFormatter: (params) => params.value || '-',
      },
      {
        headerName: 'UCID',
        field: 'ucid',
        flex: 1.5,
        minWidth: 200,
      },
      {
        headerName: '발신',
        field: 'ani',
        width: 130,
        valueFormatter: (params) => params.value || '-',
      },
      {
        headerName: '착신',
        field: 'dnis',
        width: 130,
        valueFormatter: (params) => params.value || '-',
      },
      {
        headerName: '버블',
        field: 'bubbleKey',
        width: 95,
      },
      {
        headerName: '화자',
        field: 'dialogRole',
        width: 95,
        cellClass: 'flex items-center',
        cellRenderer: (params: any) => {
          const v = params.value as string | null;
          if (!v) return '-';
          return (
            <Badge variant="secondary" className={cn('text-[12px] leading-[12px] font-medium !h-6', dialogRoleBadgeClass(v))}>
              {v === 'BOT' ? '봇' : v === 'CUSTOMER' ? '고객' : v}
            </Badge>
          );
        },
      },
      {
        headerName: '사유',
        field: 'reasonCode',
        width: 110,
        cellRenderer: (params: any) => {
          const code = params.value as string | null;
          if (!code) return '-';
          return REASON_CODE_LABELS[code] ?? code;
        },
        tooltipField: 'reasonText',
      },
      {
        headerName: 'IP',
        field: 'clientIp',
        width: 130,
        valueFormatter: (params) => params.value || '-',
      },
    ],
    [onDetailClick],
  );

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 w-full overflow-hidden">
        <AgGridReact<DecryptLogItem>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          onFirstDataRendered={handleFirstDataRendered}
          gridOptions={{
            ...gridOptions,
            pagination: false,
            statusBar: undefined,
            rowStyle: { cursor: 'pointer' },
            onRowDoubleClicked: (event) => event.data && onDetailClick(event.data),
            rowClassRules: {
              'bg-blue-50': (params) => !!selectedLogId && params.data?.logId === selectedLogId,
            },
          }}
          loading={isLoading}
        />
      </div>
      <ServerPagination totalItems={total} currentPage={page} pageSize={size} onPageChange={onPageChange} />
    </div>
  );
};

export default DecryptLogListGrid;
