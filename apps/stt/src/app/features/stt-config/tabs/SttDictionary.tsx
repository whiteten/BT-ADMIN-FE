import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import SttDictionaryDrawer, { type SttDictionaryDrawerRef } from '../components/SttDictionaryDrawer';
import { dictionaryQueryKeys, useDeleteSttDictionary, useGetSttDictionaryList } from '../hooks/useDictionaryQueries';
import type { SttDictionaryItem } from '../types';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 20;

interface DeleteCellRendererParams {
  data?: SttDictionaryItem;
  onDelete: (beforeWord: string) => void;
}

function UseYnCellRenderer({ value }: ICellRendererParams<SttDictionaryItem>) {
  const isUsed = value === '1' || value === 1;
  return (
    <Badge className={`text-[13px] leading-[13px] font-medium !h-6 ${isUsed ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#495057] bg-[#E9EBEC]'}`}>
      {isUsed ? '사용' : '미사용'}
    </Badge>
  );
}

function DeleteCellRenderer({ data, onDelete }: DeleteCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data.beforeWord)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function SttDictionary() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();
  const drawerRef = useRef<SttDictionaryDrawerRef>(null);

  const [keyword, setKeyword] = useState('');

  const { data: allData = [], isLoading } = useGetSttDictionaryList({});

  const filteredList = useMemo(() => {
    if (!keyword.trim()) return allData;
    const kw = keyword.toLowerCase();
    return allData.filter((item) => item.beforeWord.toLowerCase().includes(kw) || item.afterWord.toLowerCase().includes(kw));
  }, [allData, keyword]);

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

  const handleDelete = (beforeWord: string) => {
    modal.confirm.delete({ onOk: () => deleteDictionary({ beforeWord }) });
  };

  const columnDefs: ColDef<SttDictionaryItem>[] = [
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
      headerName: '변경할 단어',
      field: 'beforeWord',
      flex: 2,
    },
    {
      headerName: '변경할 단어',
      field: 'afterWord',
      flex: 2,
    },
    {
      headerName: '사용여부',
      field: 'useYn',
      maxWidth: 110,
      flex: 1,
      cellRenderer: UseYnCellRenderer,
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
        <div className="flex items-center gap-2 ml-auto">
          <Button type="primary" onClick={handleAdd}>
            추가
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<SttDictionaryItem>
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

      <SttDictionaryDrawer ref={drawerRef} />
    </div>
  );
}
