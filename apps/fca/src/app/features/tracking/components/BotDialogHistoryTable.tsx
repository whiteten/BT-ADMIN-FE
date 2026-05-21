import React, { useEffect, useMemo, useRef } from 'react';
import type { ColDef, FirstDataRenderedEvent, GridApi, GridOptions, GridReadyEvent, IServerSideDatasource, StatusPanelDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';
import { copyToClipboard, toast } from '@/shared-util';
import BotDialogHistoryPageSizeSelector, { DEFAULT_PAGE_SIZE, getSavedPageSize } from './BotDialogHistoryPageSizeSelector';
import { botDialogHistoryApi } from '../api/botDialogHistoryApi';
import type { BotDialogHistoryListItem, BotDialogHistorySearchRequest } from '../types';
import AggridPagination from '@/components/custom/AggridPagination';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const AUTO_SIZE_COLUMNS = ['ucid', 'serviceName'];

interface BotDialogHistoryTableProps {
  searchParams: BotDialogHistorySearchRequest;
  searchVersion: number;
  onRowDoubleClick: (data: BotDialogHistoryListItem) => void;
  selectedRowId?: string;
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onTotalRowsChange?: (total: number) => void;
}

const BotDialogHistoryTable: React.FC<BotDialogHistoryTableProps> = ({
  searchParams,
  searchVersion,
  onRowDoubleClick,
  selectedRowId,
  isLoading,
  onLoadingChange,
  onTotalRowsChange,
}) => {
  const { gridOptions } = useAggridOptions();
  const gridApiRef = useRef<GridApi<BotDialogHistoryListItem> | null>(null);
  const searchParamsRef = useRef(searchParams);
  const initialPageSize = useMemo(() => getSavedPageSize(), []);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const serverSideDatasource = useMemo<IServerSideDatasource>(
    () => ({
      getRows: async (params) => {
        const startRow = params.request.startRow ?? 0;
        const endRow = params.request.endRow ?? startRow + DEFAULT_PAGE_SIZE;
        const size = endRow - startRow;
        const page = Math.floor(startRow / size);
        try {
          onLoadingChange?.(true);
          const res = await botDialogHistoryApi.getBotDialogHistory({
            ...searchParamsRef.current,
            page,
            size,
          });
          params.success({ rowData: res.items, rowCount: res.total });
          onTotalRowsChange?.(res.total);
        } catch {
          params.fail();
        } finally {
          onLoadingChange?.(false);
        }
      },
    }),
    [onLoadingChange, onTotalRowsChange],
  );

  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.refreshServerSide({ purge: true });
    gridApiRef.current.deselectAll?.();
  }, [searchVersion]);

  useEffect(() => {
    gridApiRef.current?.redrawRows();
  }, [selectedRowId]);

  const handleGridReady = (event: GridReadyEvent<BotDialogHistoryListItem>) => {
    gridApiRef.current = event.api;
  };

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
        headerName: '완료여부',
        field: 'serviceCompleteYn',
        width: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: any) => {
          const val = params.value;
          const isComplete = val === 1;
          return (
            <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${isComplete ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#495057] bg-[#E9EBEC]'}`}>
              {isComplete ? '완료' : '미완료'}
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
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: any) => {
          const value: string | undefined = params.value;
          if (!value) return '-';
          const handleCopy = async (e: React.MouseEvent) => {
            e.stopPropagation();
            try {
              await copyToClipboard(value);
              toast.success('UCID가 복사되었습니다.');
            } catch {
              toast.error('복사에 실패했습니다.');
            }
          };
          return (
            <div className="flex items-center gap-1.5 w-full min-w-0">
              <span className="truncate">{value}</span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="UCID 복사"
                className="shrink-0 inline-flex items-center justify-center size-6 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          );
        },
      },
      {
        headerName: '신뢰도',
        field: 'avgConfidence',
        width: 140,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: 'percentBarRenderer',
      },
      {
        headerName: '재학습',
        field: 'retrainYn',
        width: 110,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: any) => {
          const retrainYn = params.data?.retrainYn;
          const retrainByMe = params.data?.retrainByMe;
          if (retrainByMe) {
            return (
              <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-[#0AB39C] bg-[#0AB39C1A]">
                내가 수정
              </Badge>
            );
          }
          if (retrainYn) {
            return (
              <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-[#3577F1] bg-[#3577F11A]">
                수정됨
              </Badge>
            );
          }
          return (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-[#495057] bg-[#E9EBEC]">
              미수정
            </Badge>
          );
        },
      },
      {
        headerName: '총 봇 질의수',
        field: 'botSlotInCount',
        width: 90,
        cellClass: 'text-right',
        valueFormatter: (params) => params.value?.toLocaleString() ?? '0',
      },
      {
        headerName: '슬롯실패건수',
        field: 'botSlotFailCount',
        width: 110,
        cellClass: 'text-right',
        valueFormatter: (params) => params.value?.toLocaleString() ?? '0',
      },
    ],
    [],
  );

  const statusBar = useMemo(
    () => ({
      statusPanels: [{ statusPanel: AggridPagination, align: 'left' } as StatusPanelDef, { statusPanel: BotDialogHistoryPageSizeSelector, align: 'left' } as StatusPanelDef],
    }),
    [],
  );

  const finalGridOptions = useMemo<GridOptions<BotDialogHistoryListItem>>(
    () => ({
      ...gridOptions,
      rowModelType: 'serverSide',
      paginationPageSize: initialPageSize,
      cacheBlockSize: initialPageSize,
      statusBar,
      localeText: { ...gridOptions.localeText, loadingOoo: ' ' },
      defaultColDef: { ...gridOptions.defaultColDef, sortable: false } as ColDef<BotDialogHistoryListItem>,
      getRowId: (p) => `${p.data.ucid}_${p.data.nextHop}_${p.data.cdrPkey}`,
      rowStyle: { cursor: 'pointer' },
      onFirstDataRendered: (event: FirstDataRenderedEvent<BotDialogHistoryListItem>) => {
        event.api.autoSizeColumns(AUTO_SIZE_COLUMNS);
      },
      onRowDoubleClicked: (event) => event.data && onRowDoubleClick(event.data),
      rowClassRules: {
        'bg-blue-50': (params) => {
          if (!selectedRowId || !params.data) return false;
          return `${params.data.ucid}_${params.data.nextHop}_${params.data.cdrPkey}` === selectedRowId;
        },
      },
    }),
    [gridOptions, selectedRowId, onRowDoubleClick, statusBar, initialPageSize],
  );

  return (
    <div className="w-full h-full">
      <AgGridReact<BotDialogHistoryListItem>
        columnDefs={columnDefs}
        gridOptions={finalGridOptions}
        serverSideDatasource={serverSideDatasource}
        onGridReady={handleGridReady}
        loading={isLoading}
      />
    </div>
  );
};

export default BotDialogHistoryTable;
