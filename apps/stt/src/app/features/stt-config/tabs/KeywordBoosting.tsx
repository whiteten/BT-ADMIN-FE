import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetCodes } from '../hooks/useCommonQueries';
import { dictionaryQueryKeys, useCreateKeywordBoosting, useDeleteKeywordBoosting, useGetKeywordBoostingList } from '../hooks/useDictionaryQueries';
import type { KeywordBoostingItem } from '../types';
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

  const [keyword, setKeyword] = useState('');
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

  const filteredList = useMemo(() => {
    if (!keyword.trim()) return allData;
    return allData.filter((item) => item.keyword.toLowerCase().includes(keyword.toLowerCase()));
  }, [allData, keyword]);

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
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="키워드를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select
            value={engineCode}
            onChange={(val) => {
              setEngineCode(val);
              setKeyword('');
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
          <Button onClick={() => toast.warning('Import 기능은 준비 중입니다.')}>Import</Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<KeywordBoostingItem>
          rowData={filteredList}
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
