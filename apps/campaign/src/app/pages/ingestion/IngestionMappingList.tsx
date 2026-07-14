import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Modal, Upload, type UploadFile } from 'antd';
import dayjs from 'dayjs';
import { Plus, Upload as UploadIcon } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import {
  ingestionQueryKeys,
  useDeleteIngestMapping,
  useGetIngestMappingList,
  useRunIngestion,
} from '../../features/ingestion/hooks/useIngestionQueries';
import type { IngestMappingListItem } from '../../features/ingestion/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '적재', path: '/campaign/ingestion' },
  { title: '매핑 설정', path: '/campaign/ingestion/mapping/list' },
];

export default function IngestionMappingList() {
  const navigate = useNavigate();
  const modal = useModal();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { gridOptions } = useAggridOptions();
  const { data: mappingList = [], isLoading } = useGetIngestMappingList();
  const { mutate: deleteMapping } = useDeleteIngestMapping();
  const { mutate: runIngestion, isPending: isRunning } = useRunIngestion();

  // 적재 실행 모달 상태
  const [runTarget, setRunTarget] = useState<IngestMappingListItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const handleCreate = () => navigate('../create');
  const handleEdit = (mappingId: number) => navigate(`../${mappingId}`);

  const handleDelete = (mappingId: number) => {
    modal.confirm.delete({
      onOk: () =>
        deleteMapping(mappingId, {
          onSuccess: () => {
            toast.success('매핑이 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ingestionQueryKeys.mappingList.queryKey });
          },
          onError: () => toast.error('삭제에 실패했습니다.'),
        }),
    });
  };

  const openRunModal = (mapping: IngestMappingListItem) => {
    setRunTarget(mapping);
    setSelectedFile(null);
    setFileList([]);
  };

  const closeRunModal = () => {
    setRunTarget(null);
    setSelectedFile(null);
    setFileList([]);
  };

  const handleRun = () => {
    if (!runTarget || !selectedFile) {
      toast.warning('적재할 파일을 선택하세요.');
      return;
    }
    runIngestion(
      { mappingId: runTarget.mappingId, file: selectedFile },
      {
        onSuccess: (history) => {
          toast.success('적재가 실행되었습니다. 이력에서 결과를 확인하세요.');
          queryClient.invalidateQueries({ queryKey: ingestionQueryKeys.historyList.queryKey });
          closeRunModal();
          navigate(history?.historyId ? `/campaign/ingestion/history?historyId=${history.historyId}` : '/campaign/ingestion/history');
        },
        onError: () => toast.error('적재 실행에 실패했습니다.'),
      },
    );
  };

  const columnDefs: ColDef<IngestMappingListItem>[] = [
    { headerName: 'ID', field: 'mappingId', width: 80 },
    { headerName: '매핑명', field: 'mappingName', flex: 1, minWidth: 180 },
    { headerName: '수신방식', field: 'sourceType', width: 110 },
    { headerName: '구분자', field: 'delimiter', width: 90 },
    { headerName: '오류정책', field: 'errorPolicy', width: 120 },
    { headerName: '사용', field: 'useYn', width: 80 },
    { headerName: '설명', field: 'description', flex: 1, minWidth: 160 },
    {
      headerName: '등록일',
      field: 'regDt',
      width: 170,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      headerName: '관리',
      width: 230,
      sortable: false,
      cellRenderer: (params: { data?: IngestMappingListItem }) => {
        const row = params.data;
        if (!row) return null;
        return (
          <div className="flex items-center gap-1.5 h-full">
            <Button size="small" onClick={() => handleEdit(row.mappingId)}>
              수정
            </Button>
            <Button size="small" type="primary" icon={<UploadIcon className="size-3.5" />} onClick={() => openRunModal(row)}>
              적재실행
            </Button>
            <Button size="small" danger onClick={() => handleDelete(row.mappingId)}>
              삭제
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2">
          <span className="text-sm text-[#868e96]">고객사 파일을 표준 테이블에 적재하기 위한 매핑 규칙을 관리합니다.</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button onClick={() => navigate('/campaign/ingestion/history')}>적재 이력</Button>
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
              매핑 추가
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<IngestMappingListItem>
            rowModelType="clientSide"
            rowData={mappingList}
            getRowId={(p) => String(p.data.mappingId)}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoading}
            pagination={false}
            rowNumbers={false}
            sideBar={false}
            onRowDoubleClicked={(e) => e.data && handleEdit(e.data.mappingId)}
          />
        </div>
      </div>

      <Modal
        title={`적재 실행 — ${runTarget?.mappingName ?? ''}`}
        open={!!runTarget}
        onCancel={closeRunModal}
        onOk={handleRun}
        okText="실행"
        cancelText="취소"
        confirmLoading={isRunning}
      >
        <p className="mb-3 text-sm text-[#868e96]">선택한 매핑 규칙으로 업로드한 파일을 적재합니다.</p>
        <Upload
          maxCount={1}
          fileList={fileList}
          beforeUpload={(file) => {
            setSelectedFile(file as unknown as File);
            setFileList([{ uid: '-1', name: file.name, status: 'done' } as UploadFile]);
            return false; // 자동 업로드 방지 (실행 버튼으로 수동 전송)
          }}
          onRemove={() => {
            setSelectedFile(null);
            setFileList([]);
          }}
        >
          <Button icon={<UploadIcon className="size-4" />}>파일 선택 (CSV)</Button>
        </Upload>
      </Modal>
    </div>
  );
}
