import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { CellEditingStoppedEvent, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { FileText, SearchCheck } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import KnowledgeMetadataDrawer, { type KnowledgeMetadataDrawerRef } from '../components/KnowledgeMetadataDrawer';
import KnowledgeSearchDrawer, { type KnowledgeSearchDrawerRef } from '../components/KnowledgeSearchDrawer';
import { knowledgeQueryKeys, useAddKnowledgeFile, useDeleteKnowledgeFiles, useGetKnowledgeFiles, useUpdateKnowledgeFileRole } from '../hooks/useKnowledgeQueries';
import type { KnowledgeFileItem } from '../types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const ROLE_OPTIONS = [
  { label: 'ADMIN', value: 3 },
  { label: 'MANAGER', value: 2 },
  { label: 'USER', value: 1 },
  { label: 'GUEST', value: 0 },
];

interface RoleCellEditorProps {
  value: number;
  onValueChange: (value: number) => void;
  cellStartedEdit?: boolean;
}

const RoleCellEditor = ({ value = 1, onValueChange, cellStartedEdit }: RoleCellEditorProps) => {
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cellStartedEdit) {
      selectRef.current?.querySelector('input')?.focus();
    }
  }, [cellStartedEdit]);

  return (
    <div ref={selectRef} className="w-full">
      <Select value={value} onChange={onValueChange} options={ROLE_OPTIONS} className="w-full" />
    </div>
  );
};

export default function KnowledgeFileList() {
  const { documentId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<KnowledgeFileItem>>(null);
  const fileImportModalRef = useRef<FileImportModalRef>(null);
  const metadataDrawerRef = useRef<KnowledgeMetadataDrawerRef>(null);
  const searchDrawerRef = useRef<KnowledgeSearchDrawerRef>(null);
  const [searchValue, setSearchValue] = useState('');

  const { data: files, isFetching } = useGetKnowledgeFiles({ params: { documentId } });

  const { mutate: addKnowledgeFile, isPending: isAdding } = useAddKnowledgeFile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('파일이 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeFiles({ documentId }).queryKey });
        fileImportModalRef.current?.close();
      },
      onError: (error) => {
        Log.warn('addKnowledgeFile failed', error);
        toast.error('파일 추가에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteKnowledgeFiles, isPending: isDeleting } = useDeleteKnowledgeFiles({
    mutationOptions: {
      onSuccess: () => {
        toast.success('파일이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeFiles({ documentId }).queryKey });
      },
      onError: (error) => {
        Log.warn('deleteKnowledgeFiles failed', error);
        toast.error('파일 삭제에 실패했습니다.');
      },
    },
  });

  const { mutate: updateFileRole } = useUpdateKnowledgeFileRole({
    mutationOptions: {
      onSuccess: () => toast.success('파일 권한이 변경되었습니다.'),
      onError: (error) => Log.warn('updateFileRole failed', error),
    },
  });

  const handleAddFile = (uploadFiles: File[]) => {
    addKnowledgeFile({ params: { documentId: documentId! }, files: uploadFiles });
  };

  const handleDeleteFiles = () => {
    const selectedRows = gridRef.current?.api.getSelectedRows() ?? [];
    if (selectedRows.length === 0) {
      toast.warning('삭제할 파일을 선택해주세요.');
      return;
    }
    modal.confirm.delete({
      onOk: () => {
        const fileIds = selectedRows.map((row) => row.fileId);
        deleteKnowledgeFiles({ params: { documentId: documentId! }, data: { fileIds } });
      },
    });
  };

  const handleCellEditingStopped = (event: CellEditingStoppedEvent<KnowledgeFileItem>) => {
    if (event.column.getColId() === 'roleCode' && event.data && event.newValue !== event.oldValue && event.newValue !== undefined) {
      updateFileRole({ fileId: event.data.fileId, roleCode: event.newValue as number });
    }
  };

  const filteredFiles = (files ?? []).filter((file) => (searchValue.trim() ? file.fileName.toLowerCase().includes(searchValue.toLowerCase()) : true));

  const columnDefs: ColDef<KnowledgeFileItem>[] = [
    {
      checkboxSelection: true,
      headerCheckboxSelection: true,
      maxWidth: 50,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      resizable: false,
    },
    { field: 'fileId', hide: true },
    {
      headerName: '파일명',
      field: 'fileName',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center', gap: '8px' },
      cellRenderer: (params: ICellRendererParams<KnowledgeFileItem>) => (
        <span className="flex items-center gap-2">
          <FileText className="size-4 text-blue-500 shrink-0" />
          {params.value}
        </span>
      ),
    },
    {
      headerName: '청크 수',
      field: 'chunkCount',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => params.value ?? 0,
    },
    {
      headerName: '권한',
      field: 'roleCode',
      maxWidth: 160,
      editable: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<KnowledgeFileItem>) => {
        const label = ROLE_OPTIONS.find((o) => o.value === (params.value ?? 1))?.label ?? 'USER';
        return label;
      },
      cellEditor: RoleCellEditor,
      suppressKeyboardEvent: (params) => params.editing && params.event.key === 'Enter',
    },
    {
      headerName: '업로드 시간',
      field: 'uploadedAt',
      maxWidth: 200,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2">
        <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="검색어를 입력하세요." className="w-full max-w-[300px]" />
        <div className="flex items-center gap-2.5">
          <Button variant="solid" icon={<SearchCheck className="size-4" />} onClick={() => searchDrawerRef.current?.open({ documentId: documentId! })}>
            검색 테스트
          </Button>
          <Button variant="solid" onClick={() => metadataDrawerRef.current?.open({ documentId: documentId! })}>
            메타데이터
          </Button>
          <Button variant="solid" color="primary" onClick={() => fileImportModalRef.current?.open()}>
            파일 추가
          </Button>
          <Button variant="solid" color="red" onClick={handleDeleteFiles} loading={isDeleting}>
            파일 삭제
          </Button>
        </div>
      </header>

      <div className="w-full h-full">
        <AgGridReact<KnowledgeFileItem>
          ref={gridRef}
          rowData={filteredFiles}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          rowSelection="multiple"
          suppressRowClickSelection
          getRowId={(params) => params.data.fileId}
          loading={isFetching}
          onCellEditingStopped={handleCellEditingStopped}
        />
      </div>

      <FileImportModal
        ref={fileImportModalRef}
        title="파일 추가"
        accept=".txt,.md,.pdf,.html,.xlsx,.xls,.docx,.csv"
        multiple
        maxCount={10}
        maxSizeMB={15}
        okText="추가"
        onConfirm={handleAddFile}
        confirmLoading={isAdding}
      />
      <KnowledgeMetadataDrawer ref={metadataDrawerRef} />
      <KnowledgeSearchDrawer ref={searchDrawerRef} />
    </div>
  );
}
