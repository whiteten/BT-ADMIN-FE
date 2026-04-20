import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { dictionaryQueryKeys, useCreateKeywordBoosting, useDeleteKeywordBoosting, useGetKeywordBoostingList } from '../hooks/useDictionaryQueries';
import type { KeywordBoostingItem, KeywordBoostingSearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 10;

const ENGINE_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'ENGINE#0', value: 'ENGINE0' },
  { label: 'ENGINE#1', value: 'ENGINE1' },
];

interface DeleteCellRendererParams {
  data?: KeywordBoostingItem;
  onDelete: (id: number) => void;
}

function DeleteCellRenderer({ data, onDelete }: DeleteCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data.id)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function KeywordBoosting() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const [searchParams, setSearchParams] = useState<KeywordBoostingSearchParams>({});

  const { data: rowData = [], isLoading } = useGetKeywordBoostingList({
    params: searchParams as Record<string, unknown>,
  });

  const { mutate: createKeyword } = useCreateKeywordBoosting({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        setNewKeyword('');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getKeywordBoostingList(searchParams).queryKey });
      },
      onError: () => {
        toast.error('등록에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteKeyword } = useDeleteKeywordBoosting({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getKeywordBoostingList(searchParams).queryKey });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleSearch = () => {
    setSearchParams({
      keyword: keyword || undefined,
      engineCode: engineCode || undefined,
    });
  };

  const handleAdd = () => {
    if (!newKeyword.trim()) {
      toast.warning('키워드를 입력해주세요.');
      return;
    }
    createKeyword({ keyword: newKeyword.trim(), engineCode });
  };

  const handleDelete = (id: number) => {
    modal.confirm.delete({ onOk: () => deleteKeyword(id) });
  };

  const columnDefs: ColDef<KeywordBoostingItem>[] = [
    {
      headerName: '',
      colId: 'rowNum',
      maxWidth: 60,
      sortable: false,
      filter: false,
      valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' },
    },
    {
      headerName: '키워드',
      field: 'keyword',
      flex: 4,
      tooltipField: 'keyword',
    },
    {
      headerName: '등록자',
      field: 'workUser',
      flex: 2,
    },
    {
      headerName: '등록일',
      field: 'workTime',
      flex: 2,
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
          <span className="text-sm font-medium text-[#495057] shrink-0">키워드</span>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} placeholder="키워드를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode} onChange={setEngineCode} options={ENGINE_OPTIONS} style={{ width: 140 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onPressEnter={handleAdd}
            placeholder="한글 6자 이내로 입력하세요"
            maxLength={6}
            style={{ width: 220 }}
          />
          <Button type="primary" onClick={handleAdd}>
            추가
          </Button>
          <Button onClick={() => toast.warning('Import 기능은 준비 중입니다.')}>Import</Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<KeywordBoostingItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
          }}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
