import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
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

  const { data: targetList = [], isLoading } = useGetRecogTargetList({ groupCode, engineCode });

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
    modal.confirm.delete({ onOk: () => deleteTarget({ ucidGkey: data.ucidGkey, armsoffset: data.armsoffset, rxtxKind: data.rxtxKind, groupCode }) });
  };

  const columnDefs: ColDef<RecogTargetListItem>[] = [
    { headerName: '정답지 내용', field: 'orgSentence', flex: 4, tooltipField: 'orgSentence' },
    {
      headerName: '화자',
      field: 'rxtxKind',
      maxWidth: 90,
      flex: 1,
      valueFormatter: (params) => ({ '1': '고객', '2': '상담원', '9': '통합' })[String(params.value)] ?? params.value,
    },
    { headerName: '고유번호(UCID)', field: 'ucidGkey', flex: 3, tooltipField: 'ucidGkey' },
    { headerName: '등록일', field: 'loadTime', flex: 2, valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '') },
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
      <div className="flex-1 min-h-[200px]">
        <AgGridReact<RecogTargetListItem>
          ref={gridRef}
          rowData={targetList}
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
