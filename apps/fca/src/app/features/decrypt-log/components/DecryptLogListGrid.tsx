import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ColDef, FirstDataRenderedEvent, GridApi, GridOptions, GridReadyEvent, IServerSideDatasource } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { decryptLogApi } from '../api/decryptLogApi';
import { type DecryptLogItem, type DecryptLogSearchRequest, REASON_CODE_LABELS, RESULT_LABELS } from '../types';
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
      return 'text-emerald-600 bg-emerald-50';
    case 'DECRYPT_FAIL':
      return 'text-red-500 bg-red-50';
    case 'FORBIDDEN':
      return 'text-amber-600 bg-amber-50';
    case 'NOT_FOUND':
      return 'text-gray-500 bg-gray-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

/** 화자 역할 배지 색상 */
const dialogRoleBadgeClass = (role: string | null): string => {
  switch (role) {
    case 'BOT':
      return 'text-blue-600 bg-blue-50';
    case 'CUSTOMER':
      return 'text-emerald-600 bg-emerald-50';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

/** 화자 라벨 — 셀·필터 공용 */
const dialogRoleLabel = (role: string | null): string => {
  if (!role) return '';
  if (role === 'BOT') return '봇';
  return role === 'CUSTOMER' ? '고객' : role;
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
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        filterValueGetter: (params) => (params.data?.result ? (RESULT_LABELS[params.data.result] ?? params.data.result) : ''),
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
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        filterValueGetter: (params) => dialogRoleLabel(params.data?.dialogRole ?? null),
        cellRenderer: (params: any) => {
          const v = params.value as string | null;
          if (!v) return '-';
          return (
            <Badge variant="secondary" className={cn('text-[12px] leading-[12px] font-medium !h-6', dialogRoleBadgeClass(v))}>
              {dialogRoleLabel(v)}
            </Badge>
          );
        },
      },
      {
        headerName: '사유',
        field: 'reasonCode',
        width: 110,
        filterValueGetter: (params) => (params.data?.reasonCode ? (REASON_CODE_LABELS[params.data.reasonCode] ?? params.data.reasonCode) : ''),
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
