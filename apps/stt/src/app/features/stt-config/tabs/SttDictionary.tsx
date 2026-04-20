import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import SttDictionaryDrawer, { type SttDictionaryDrawerRef } from '../components/SttDictionaryDrawer';
import { dictionaryQueryKeys, useDeleteSttDictionary, useGetSttDictionaryList } from '../hooks/useDictionaryQueries';
import type { SttDictionaryItem, SttDictionarySearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 10;

interface DeleteCellRendererParams {
  data?: SttDictionaryItem;
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

export default function SttDictionary() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();
  const drawerRef = useRef<SttDictionaryDrawerRef>(null);

  const [keyword, setKeyword] = useState('');
  const [searchParams, setSearchParams] = useState<SttDictionarySearchParams>({});

  const { data: rowData = [], isLoading } = useGetSttDictionaryList({
    params: searchParams as Record<string, unknown>,
  });

  const { mutate: deleteItem } = useDeleteSttDictionary({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getSttDictionaryList(searchParams).queryKey });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleSearch = () => {
    setSearchParams({ keyword: keyword || undefined });
  };

  const handleDelete = (id: number) => {
    modal.confirm.delete({ onOk: () => deleteItem(id) });
  };

  const handleAdd = () => {
    drawerRef.current?.open({ searchParams });
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
      valueFormatter: (params) => (params.value === 'Y' ? '사용' : '미사용'),
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
        <div className="flex items-center gap-2 ml-auto">
          <Button type="primary" onClick={handleAdd}>
            추가
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<SttDictionaryItem>
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

      <SttDictionaryDrawer ref={drawerRef} />
    </div>
  );
}
