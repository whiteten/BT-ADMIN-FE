import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Download, Trash2, Upload } from 'lucide-react';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../components/ExcelImportResultModal';
import { useGetCodes } from '../hooks/useCommonQueries';
import {
  dictionaryQueryKeys,
  useCreateKeywordBoosting,
  useDeleteKeywordBoosting,
  useExportKeywordBoostingTemplate,
  useGetKeywordBoostingList,
  useImportKeywordBoosting,
} from '../hooks/useDictionaryQueries';
import type { KeywordBoostingItem } from '../types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 20;

interface DeleteCellRendererParams {
  data?: KeywordBoostingItem;
  onDelete: (data: KeywordBoostingItem) => void;
}

function DeleteCellRenderer({ data, onDelete }: DeleteCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function KeywordBoosting() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

  const [engineCode, setEngineCode] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const { data: engines } = useGetCodes({ params: { classCd: 'ENGINE_KIND' } });
  const engineOptions = engines?.map((e) => ({ label: e.value, value: e.code })) ?? [];

  useEffect(() => {
    if (engines && engines.length > 0) {
      setEngineCode((prev) => prev || engines[0].code);
    }
  }, [engines]);

  const { data: allData = [], isLoading } = useGetKeywordBoostingList({
    params: { engineCode: engineCode || undefined },
    queryOptions: { enabled: !!engineCode },
  });

  const { mutate: createKeywordBoosting } = useCreateKeywordBoosting({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        setNewKeyword('');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getKeywordBoostingList({ engineCode }).queryKey });
      },
      onError: () => {
        toast.error('등록에 실패했습니다.');
      },
    },
  });

  const { mutate: exportTemplate, isPending: isExporting } = useExportKeywordBoostingTemplate();

  const { mutate: importKeywordBoosting, isPending: isImporting } = useImportKeywordBoosting({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getKeywordBoostingList({ engineCode }).queryKey });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data);
      },
      onError: () => {
        toast.error('Import에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteKeyword } = useDeleteKeywordBoosting({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getKeywordBoostingList({ engineCode }).queryKey });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleNewKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/g, '').slice(0, 6);
    setNewKeyword(filtered);
  };

  const handleAdd = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) {
      toast.warning('키워드를 입력해주세요.');
      return;
    }
    if (!/^[가-힣ㄱ-ㅎㅏ-ㅣ]+$/.test(trimmed)) {
      toast.warning('한글만 입력 가능합니다.');
      return;
    }
    if (trimmed.length > 6) {
      toast.warning('6자 이내로 입력해주세요.');
      return;
    }
    createKeywordBoosting({ keyword: trimmed, engineCode });
  };

  const handleDelete = (data: KeywordBoostingItem) => {
    modal.confirm.delete({ onOk: () => deleteKeyword({ engineCode: data.engineCode ?? '', keyword: data.keyword }) });
  };

  const handleClickImport = () => {
    importModalRef.current?.open();
  };

  const handleImportKeywordBoosting = (files: File[]) => {
    if (files.length > 0) {
      importKeywordBoosting({ engineCode, data: files[0] });
    }
  };

  const columnDefs: ColDef<KeywordBoostingItem>[] = [
    {
      headerName: '키워드',
      field: 'keyword',
      flex: 4,
      tooltipField: 'keyword',
      filter: true,
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select
            value={engineCode}
            onChange={(val) => {
              setEngineCode(val);
            }}
            options={engineOptions}
            style={{ width: 140 }}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Input value={newKeyword} onChange={handleNewKeywordChange} onPressEnter={handleAdd} placeholder="한글 6자 이내로 입력하세요" maxLength={6} style={{ width: 220 }} />
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
        <AgGridReact<KeywordBoostingItem>
          rowData={allData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
          }}
          loading={isLoading}
          sideBar={false}
        />
      </div>
      <FileImportModal ref={importModalRef} title="Import" accept=".xlsx,.xls" onConfirm={handleImportKeywordBoosting} confirmLoading={isImporting} />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="키워드" />
    </div>
  );
}
