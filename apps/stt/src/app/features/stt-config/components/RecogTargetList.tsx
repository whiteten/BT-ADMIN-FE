import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { recogQueryKeys, useDeleteRecogTarget, useGetRecogTargetList } from '../hooks/useRecogQueries';
import type { RecogTargetListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 20;

interface DeleteCellRendererParams extends ICellRendererParams<RecogTargetListItem> {
  onDelete: (data: RecogTargetListItem) => void;
}

function DeleteCellRenderer({ data, onDelete }: DeleteCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

interface RecogTargetListProps {
  groupCode: string;
  engineCode?: string;
}

export default function RecogTargetList({ groupCode, engineCode }: RecogTargetListProps) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const gridRef = useRef<AgGridReact<RecogTargetListItem>>(null);
  const { gridOptions } = useAggridOptions();

  const [searchValue, setSearchValue] = useState('');

  const { data: targetList = [], isLoading } = useGetRecogTargetList({ groupCode, engineCode });

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return targetList;
    const keyword = searchValue.toLowerCase();
    return targetList.filter((t) => t.orgSentence.toLowerCase().includes(keyword) || t.ucidGkey.toLowerCase().includes(keyword));
  }, [targetList, searchValue]);

  const { mutate: deleteTarget } = useDeleteRecogTarget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogTargetList({ groupCode, engineCode }).queryKey });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleDelete = (data: RecogTargetListItem) => {
    modal.confirm.delete({ onOk: () => deleteTarget(data.id) });
  };

  const columnDefs: ColDef<RecogTargetListItem>[] = [
    { headerName: 'TEXT', field: 'orgSentence', flex: 4, tooltipField: 'orgSentence' },
    {
      headerName: '화자',
      field: 'rxtxKind',
      maxWidth: 90,
      flex: 1,
      valueFormatter: (params) => ({ '1': '고객', '2': '상담원', '9': '통합' })[String(params.value)] ?? params.value,
    },
    { headerName: 'UCID_GKEY', field: 'ucidGkey', flex: 3, tooltipField: 'ucidGkey' },
    { headerName: '등록일', field: 'loadTime', flex: 2 },
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
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center">
        <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="문장 또는 UCID 검색" allowClear style={{ width: 220 }} />
      </div>

      <div className="flex-1 min-h-[200px]">
        <AgGridReact<RecogTargetListItem>
          ref={gridRef}
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
