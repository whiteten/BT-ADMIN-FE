import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ColDef, FirstDataRenderedEvent, GridApi, GridOptions, GridReadyEvent, IServerSideDatasource } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { decryptLogApi } from '../api/decryptLogApi';
import { type DecryptLogItem, type DecryptLogSearchRequest, REASON_CODE_LABELS, RESULT_LABELS } from '../types/decryptLog.types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const PAGE_SIZE = 50;

interface DecryptLogListGridProps {
  searchParams: DecryptLogSearchRequest;
  searchVersion: number;
  onDetailClick: (item: DecryptLogItem) => void;
  selectedLogId?: string;
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
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

const DecryptLogListGrid: React.FC<DecryptLogListGridProps> = ({ searchParams, searchVersion, onDetailClick, selectedLogId, isLoading, onLoadingChange }) => {
  const { gridOptions } = useAggridOptions();
  const gridApiRef = useRef<GridApi<DecryptLogItem> | null>(null);
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const serverSideDatasource = useMemo<IServerSideDatasource>(
    () => ({
      getRows: async (params) => {
        const startRow = params.request.startRow ?? 0;
        const endRow = params.request.endRow ?? startRow + PAGE_SIZE;
        const size = endRow - startRow;
        const page = Math.floor(startRow / size);
        try {
          onLoadingChange?.(true);
          const res = await decryptLogApi.list({ ...searchParamsRef.current, page, size });
          params.success({ rowData: res.items, rowCount: res.total });
        } catch {
          params.fail();
        } finally {
          onLoadingChange?.(false);
        }
      },
    }),
    [onLoadingChange],
  );

  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.refreshServerSide({ purge: true });
    gridApiRef.current.deselectAll?.();
  }, [searchVersion]);

  useEffect(() => {
    gridApiRef.current?.redrawRows();
  }, [selectedLogId]);

  const handleGridReady = (event: GridReadyEvent<DecryptLogItem>) => {
    gridApiRef.current = event.api;
  };

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
    [],
  );

  const finalGridOptions = useMemo<GridOptions<DecryptLogItem>>(
    () => ({
      ...gridOptions,
      rowModelType: 'serverSide',
      paginationPageSize: PAGE_SIZE,
      cacheBlockSize: PAGE_SIZE,
      localeText: { ...gridOptions.localeText, loadingOoo: ' ' },
      defaultColDef: { ...gridOptions.defaultColDef, sortable: false } as ColDef<DecryptLogItem>,
      getRowId: (p) => p.data.logId,
      rowStyle: { cursor: 'pointer' },
      onRowDoubleClicked: (event) => event.data && onDetailClick(event.data),
      rowClassRules: {
        'bg-blue-50': (params) => !!selectedLogId && params.data?.logId === selectedLogId,
      },
    }),
    [gridOptions, selectedLogId, onDetailClick],
  );

  return (
    <div className="w-full h-full">
      <AgGridReact<DecryptLogItem>
        columnDefs={columnDefs}
        gridOptions={finalGridOptions}
        serverSideDatasource={serverSideDatasource}
        onGridReady={handleGridReady}
        onFirstDataRendered={handleFirstDataRendered}
        loading={isLoading}
      />
    </div>
  );
};

export default DecryptLogListGrid;
