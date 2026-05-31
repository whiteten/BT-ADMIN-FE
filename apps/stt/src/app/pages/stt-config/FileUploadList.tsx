import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Select, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Pause, Play, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import FileUploadDrawer, { type FileUploadDrawerRef } from '../../features/stt-config/components/FileUploadDrawer';
import SttSearchDetailDrawer, { type SttSearchDetailDrawerRef } from '../../features/stt-config/components/SttSearchDetailDrawer';
import { fileUploadQueryKeys, useDeleteFileUpload, useGetFileUploadList } from '../../features/stt-config/hooks/useFileUploadQueries';
import type { FileUploadItem, FileUploadSearchParams, SttSearchItem } from '../../features/stt-config/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: 'STT 파일업로드', path: '/stt/stt-config/file-upload/list' },
];

const WORK_KIND_CONFIG: Record<string, { label: string; className: string }> = {
  진행중: { label: '진행중', className: 'text-blue-600 bg-blue-100' },
  대기중: { label: '대기중', className: 'text-gray-500 bg-gray-100' },
  종료: { label: '종료', className: 'text-emerald-600 bg-emerald-100' },
  실패: { label: '실패', className: 'text-red-500 bg-red-100' },
};

const PAGE_SIZE = 20;

function WorkKindCellRenderer({ value }: ICellRendererParams<FileUploadItem>) {
  const config = WORK_KIND_CONFIG[String(value)] ?? { label: String(value ?? ''), className: 'text-gray-500 bg-gray-100' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>{config.label}</span>;
}

interface ActionCellParams extends ICellRendererParams<FileUploadItem> {
  onDelete: (data: FileUploadItem) => void;
}

function ActionCellRenderer({ data, onDelete }: ActionCellParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function FileUploadList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<FileUploadItem>>(null);
  const queryClient = useQueryClient();
  const modal = useModal();
  const drawerRef = useRef<FileUploadDrawerRef>(null);
  const detailDrawerRef = useRef<SttSearchDetailDrawerRef>(null);

  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(3);
  const [searchParams, setSearchParams] = useState<FileUploadSearchParams | null>({
    fromDate: dayjs().subtract(7, 'day').format('YYYYMMDD'),
    toDate: dayjs().format('YYYYMMDD'),
  });

  const { data: rowData = [], isLoading } = useGetFileUploadList({
    params: searchParams,
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  useEffect(() => {
    if (!fromDate || !toDate) return;
    if (fromDate.isAfter(toDate)) return;
    setSearchParams({ fromDate: fromDate.format('YYYYMMDD'), toDate: toDate.format('YYYYMMDD') });
  }, [fromDate, toDate]);

  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<FileUploadItem>) => {
    if (!event.data) return;
    detailDrawerRef.current?.open(event.data as unknown as SttSearchItem);
  };

  const { mutate: deleteFile } = useDeleteFileUpload({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: fileUploadQueryKeys.getFileUploadList._def });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleDelete = (data: FileUploadItem) => {
    modal.confirm.delete({ onOk: () => deleteFile(data.ucidGkey) });
  };

  const columnDefs: ColDef<FileUploadItem>[] = [
    {
      headerName: '등록일',
      field: 'callDate',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value, 'YYYYMMDD').format('YYYY-MM-DD') : ''),
    },
    {
      headerName: '등록시간',
      field: 'callTime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value, 'HHmmss').format('HH:mm:ss') : ''),
    },
    { headerName: '통화시간', field: 'talkTime', flex: 2 },
    { headerName: '고유번호(UCID)', field: 'ucidGkey', flex: 4, tooltipField: 'ucidGkey' },
    { headerName: '파일명', field: 'filename', flex: 4, tooltipField: 'filename' },
    {
      headerName: '상태',
      field: 'workKind',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: WorkKindCellRenderer,
    },
    { headerName: '등록자', field: 'agentName', flex: 2 },
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
      <div className="flex-1 min-h-0 bg-white bt-shadow overflow-hidden flex flex-col">
        {/* 검색 필터 */}
        <div className="flex items-center gap-4 flex-wrap px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
            <DatePicker value={fromDate} onChange={setFromDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
            <span className="text-[#495057]">-</span>
            <DatePicker value={toDate} onChange={setToDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          </div>
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
            <Button color="cyan" variant="solid" onClick={() => drawerRef.current?.open()}>
              파일업로드
            </Button>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* 그리드 */}
        <div className="flex-1 min-h-0 p-5">
          <AgGridReact<FileUploadItem>
            ref={gridRef}
            rowData={rowData ?? []}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, paginationPageSize: PAGE_SIZE }}
            onRowDoubleClicked={handleRowDoubleClicked}
            loading={isLoading}
            sideBar={false}
          />
        </div>
      </div>

      <FileUploadDrawer ref={drawerRef} menuId="sttfile" onRequestSuccess={() => setAutoRefresh(true)} />
      <SttSearchDetailDrawer ref={detailDrawerRef} />
    </div>
  );
}
