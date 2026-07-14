import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Tag } from 'antd';
import dayjs from 'dayjs';
import { useBreadcrumbStore } from '@/shared-store';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { INGEST_STATUS_COLORS, INGEST_STATUS_LABELS } from '../../features/ingestion/constants/ingestionConstants';
import { useGetIngestHistoryErrors, useGetIngestHistoryList } from '../../features/ingestion/hooks/useIngestionQueries';
import type { IngestError, IngestHistory } from '../../features/ingestion/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '적재', path: '/campaign/ingestion' },
  { title: '적재 이력', path: '/campaign/ingestion/history' },
];

export default function IngestionHistory() {
  const [searchParams] = useSearchParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { gridOptions } = useAggridOptions();

  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(() => {
    const fromUrl = searchParams.get('historyId');
    return fromUrl ? Number(fromUrl) : null;
  });

  const { data: historyList = [], isLoading } = useGetIngestHistoryList();
  const { data: errorList = [], isLoading: isLoadingErrors } = useGetIngestHistoryErrors({
    params: { historyId: selectedHistoryId ?? 0 },
    queryOptions: { enabled: selectedHistoryId != null },
  });

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const historyColumns: ColDef<IngestHistory>[] = [
    { headerName: 'ID', field: 'historyId', width: 80 },
    { headerName: '매핑명', field: 'mappingName', flex: 1, minWidth: 160 },
    { headerName: '파일명', field: 'fileName', flex: 1, minWidth: 160 },
    {
      headerName: '상태',
      field: 'status',
      width: 110,
      cellRenderer: (p: { value?: string }) =>
        p.value ? <Tag color={INGEST_STATUS_COLORS[p.value] ?? 'default'}>{INGEST_STATUS_LABELS[p.value] ?? p.value}</Tag> : null,
    },
    { headerName: '전체', field: 'totalRows', width: 80 },
    { headerName: '성공', field: 'successRows', width: 80 },
    { headerName: '실패', field: 'failRows', width: 80 },
    { headerName: '중단행', field: 'stoppedRowNo', width: 90 },
    { headerName: '오류요약', field: 'errorSummary', flex: 1, minWidth: 180 },
    {
      headerName: '실행시각',
      field: 'startedAt',
      width: 170,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ];

  const errorColumns: ColDef<IngestError>[] = [
    { headerName: '행번호', field: 'rowNo', width: 90 },
    { headerName: '원본 데이터(원문)', field: 'rawLine', flex: 1, minWidth: 280 },
    { headerName: '실패 사유', field: 'reason', flex: 1, minWidth: 240 },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2">
          <span className="text-sm font-medium text-[#495057]">적재 이력</span>
          <span className="text-xs text-[#868e96]">행을 클릭하면 아래에 실패 행(원문·사유)이 표시됩니다.</span>
        </header>

        <div className="w-full h-[45%] min-h-[220px]">
          <AgGridReact<IngestHistory>
            rowModelType="clientSide"
            rowData={historyList}
            getRowId={(p) => String(p.data.historyId)}
            columnDefs={historyColumns}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoading}
            pagination={false}
            rowNumbers={false}
            sideBar={false}
            rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
            onRowClicked={(e) => e.data && setSelectedHistoryId(e.data.historyId)}
          />
        </div>

        <div className="flex flex-col gap-2 w-full h-[45%] min-h-[200px]">
          <span className="text-sm font-medium text-[#495057]">
            실패 행 상세{selectedHistoryId != null ? ` (이력 #${selectedHistoryId})` : ''}
          </span>
          <div className="w-full h-full">
            <AgGridReact<IngestError>
              rowModelType="clientSide"
              rowData={errorList}
              getRowId={(p) => String(p.data.errorId)}
              columnDefs={errorColumns}
              gridOptions={{ ...gridOptions, statusBar: undefined }}
              loading={isLoadingErrors}
              pagination={false}
              rowNumbers={false}
              sideBar={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
