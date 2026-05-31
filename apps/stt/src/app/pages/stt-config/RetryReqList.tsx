import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Pause, Play, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import RetryReqDrawer, { type RetryReqDrawerRef } from '../../features/stt-config/components/RetryReqDrawer';
import RetryReqTree from '../../features/stt-config/components/RetryReqTree';
import { retryReqQueryKeys, useDeleteRetryReq, useGetRetryReqList } from '../../features/stt-config/hooks/useRetryReqQueries';
import type { RetryReqListItem } from '../../features/stt-config/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: 'STT 재처리현황', path: '/stt/stt-config/retry-req/list' },
];

interface ActionCellParams extends ICellRendererParams<RetryReqListItem> {
  onDelete: (data: RetryReqListItem) => void;
}

function ActionCellRenderer({ data, onDelete }: ActionCellParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function RetryReqList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const drawerRef = useRef<RetryReqDrawerRef>(null);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(3);

  const { data: rowData = [], isLoading } = useGetRetryReqList({
    params: selectedKey ? { retryDate: selectedKey } : null,
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  const { mutate: deleteRetryReq } = useDeleteRetryReq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: retryReqQueryKeys.getRetryReqList._def });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleDelete = (data: RetryReqListItem) => {
    modal.confirm.delete({ onOk: () => deleteRetryReq(data.retryDate) });
  };

  const columnDefs: ColDef<RetryReqListItem>[] = [
    {
      headerName: '',
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      maxWidth: 58,
      sortable: false,
      filter: false,
      cellStyle: { textAlign: 'center', color: '#6c757d' },
    },
    {
      headerName: '대상일자',
      field: 'retryDate',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value, 'YYYYMMDD').format('YYYY-MM-DD') : ''),
    },
    { headerName: '재처리 타입', field: 'retryType', flex: 1.5 },
    {
      headerName: '재처리 요청일자',
      field: 'retryTime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value, 'YYYYMMDDHHmm').format('YYYY-MM-DD HH:mm') : ''),
    },
    { headerName: '재처리건수', field: 'retryCnt', flex: 1.5 },
    { headerName: '요청상태', field: 'retryStatusNm', flex: 1.5 },
    { headerName: '대상수', field: 'totalSa', flex: 1 },
    { headerName: '완료건', field: 'sumSaComplete', flex: 1 },
    { headerName: '등록자', field: 'workUser', flex: 1.5 },
    {
      headerName: '등록일자',
      field: 'dbInsertTime',
      flex: 2.5,
      valueFormatter: ({ value }) => (value ? dayjs(value, 'YYYYMMDDHHmmss').format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 60,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: ActionCellRenderer,
      cellRendererParams: { onDelete: handleDelete },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 재처리 일정 트리 */}
        <div className="w-[280px] shrink-0 bg-white bt-shadow p-4 overflow-y-auto">
          <RetryReqTree selectedKey={selectedKey} onSelect={setSelectedKey} />
        </div>

        {/* 우측: 필터 + 리스트 */}
        <div className="flex-1 min-h-0 bg-white bt-shadow overflow-hidden flex flex-col">
          {/* 필터 */}
          <div className="flex items-center gap-4 flex-wrap px-5 py-4 shrink-0">
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-[#495057] shrink-0">모니터링</span>
              <Select
                value={refreshSeconds}
                onChange={setRefreshSeconds}
                options={[
                  { label: '3초', value: 3 },
                  { label: '5초', value: 5 },
                  { label: '10초', value: 10 },
                  { label: '30초', value: 30 },
                ]}
                style={{ width: 72 }}
              />
              <Tooltip title={autoRefresh ? '모니터링 중지' : '모니터링 시작'}>
                <button
                  type="button"
                  onClick={() => setAutoRefresh((v) => !v)}
                  className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${autoRefresh ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white' : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'}`}
                >
                  {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
              </Tooltip>
              <Button type="primary" onClick={() => drawerRef.current?.open()}>
                추가
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* 그리드 */}
          <div className="flex-1 min-h-0 p-5 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              <AgGridReact<RetryReqListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoading} sideBar={false} />
            </div>
          </div>
        </div>
      </div>
      <RetryReqDrawer ref={drawerRef} />
    </div>
  );
}
