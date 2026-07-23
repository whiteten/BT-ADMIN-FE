import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Download, Trash2, Upload } from 'lucide-react';
import { useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../components/ExcelImportResultModal';
import SttDictionaryDrawer, { type SttDictionaryDrawerRef } from '../components/SttDictionaryDrawer';
import { dictionaryQueryKeys, useDeleteSttDictionary, useExportSttDictionaryTemplate, useGetSttDictionaryList, useImportSttDictionary } from '../hooks/useDictionaryQueries';
import type { SttDictionaryItem } from '../types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 20;

interface DeleteCellRendererParams {
  data?: SttDictionaryItem;
  onDelete: (data: SttDictionaryItem) => void;
}

function UseYnCellRenderer({ value }: ICellRendererParams<SttDictionaryItem>) {
  const isUsed = value === '1' || value === 1;
  return (
    <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${isUsed ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
      {isUsed ? '사용' : '미사용'}
    </Badge>
  );
}

function DeleteCellRenderer({ data, onDelete }: DeleteCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function SttDictionary() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();
  const drawerRef = useRef<SttDictionaryDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

  // 운영자 모드에서 "전체" 스코프(대행 테넌트 미지정)일 때만 테넌트 컬럼 노출 — CtiQueueTable 패턴 참고.
  // 특정 테넌트를 대행 중이거나 일반 사용자면 모든 행이 같은 테넌트라 컬럼이 무의미해서 숨김.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const showTenantColumn = operatorMode && actAsTenantId === null;

  const { data: allData = [], isLoading } = useGetSttDictionaryList({});

  const { mutate: exportTemplate, isPending: isExporting } = useExportSttDictionaryTemplate();

  const { mutate: importDictionary, isPending: isImporting } = useImportSttDictionary({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getSttDictionaryList(undefined).queryKey });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data);
      },
      onError: () => {
        toast.error('Import에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteDictionary } = useDeleteSttDictionary({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getSttDictionaryList(undefined).queryKey });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleAdd = () => {
    drawerRef.current?.open();
  };

  const handleClickImport = () => {
    importModalRef.current?.open();
  };

  const handleImportDictionary = (files: File[]) => {
    if (files.length > 0) {
      importDictionary(files[0]);
    }
  };

  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<SttDictionaryItem>) => {
    if (!event.data) return;
    drawerRef.current?.open(event.data);
  };

  const handleDelete = (data: SttDictionaryItem) => {
    modal.confirm.delete({ onOk: () => deleteDictionary({ tenantId: data.tenantId, beforeWord: data.beforeWord }) });
  };

  const columnDefs: ColDef<SttDictionaryItem>[] = [
    {
      headerName: '테넌트',
      field: 'tenantName',
      flex: 2,
      filter: true,
      hide: !showTenantColumn,
    },
    {
      headerName: '변경할 단어',
      field: 'beforeWord',
      flex: 3,
      filter: true,
    },
    {
      headerName: '수정 단어',
      field: 'afterWord',
      flex: 3,
    },
    {
      headerName: '사용여부',
      field: 'useYn',
      maxWidth: 110,
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: UseYnCellRenderer,
      filterValueGetter: ({ data }) => (String(data?.useYn) === '1' ? '사용' : '미사용'),
    },
    {
      headerName: '등록자',
      field: 'workUserName',
      flex: 2,
    },
    {
      headerName: '등록일',
      field: 'workTime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 60,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: DeleteCellRenderer,
      cellRendererParams: { onDelete: handleDelete },
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 필터 및 추가 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 ml-auto">
          <Button type="primary" onClick={handleAdd}>
            추가
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'import-excel',
                  label: (
                    <span className="flex items-center gap-2">
                      <Upload className="size-4" />
                      엑셀로 일괄추가
                    </span>
                  ),
                  onClick: handleClickImport,
                },
                {
                  key: 'template-download',
                  label: (
                    <span className="flex items-center gap-2">
                      <Download className="size-4" />
                      템플릿 다운로드
                    </span>
                  ),
                  onClick: () => exportTemplate(undefined),
                },
              ],
            }}
          >
            <Button variant="solid" loading={isExporting}>
              Import
              <ChevronDown className="size-3.5" />
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<SttDictionaryItem>
          rowData={allData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
          }}
          onRowDoubleClicked={handleRowDoubleClicked}
          getRowStyle={(params) => (String(params.data?.useYn) === '0' ? { color: '#adb5bd' } : undefined)}
          loading={isLoading}
          sideBar={false}
        />
      </div>

      <SttDictionaryDrawer ref={drawerRef} existingWords={allData.map((d) => d.beforeWord)} />
      <FileImportModal ref={importModalRef} title="Import" accept=".xlsx,.xls" onConfirm={handleImportDictionary} confirmLoading={isImporting} />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="단어" />
    </div>
  );
}
