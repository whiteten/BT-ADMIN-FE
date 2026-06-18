import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetRecogResultList } from '../hooks/useModelQueries';
import { recogQueryKeys, useDeleteRecogTarget, useGetRecogTargetList } from '../hooks/useRecogQueries';
import type { RecogTargetListItem, SttModelItem } from '../types';
import SttRecogDrawer, { type SttRecogDrawerRef } from './SttRecogDrawer';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const FIXED_MODEL: SttModelItem = {
  modelVerId: 'STT_MODEL_2026',
  modelVerName: '',
  modelDesc: '',
  recogRate: null,
  tunningKind: 0,
  tunningResult: 10,
  tunningType: 0,
  workTime: '',
};

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
  groupName?: string;
  engineCode?: string;
}

export default function RecogTargetList({ groupCode, groupName = '', engineCode }: RecogTargetListProps) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const gridRef = useRef<AgGridReact<RecogTargetListItem>>(null);
  const recogDrawerRef = useRef<SttRecogDrawerRef>(null);
  const { gridOptions } = useAggridOptions();

  const { data: targetList = [], isLoading } = useGetRecogTargetList({ groupCode, engineCode });
  const { data: recogData } = useGetRecogResultList({
    params: groupCode ? { modelVerId: FIXED_MODEL.modelVerId, groupCode } : null,
  });
  const summary = recogData?.summary;

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
    { headerName: '정답지 내용', field: 'orgSentence', flex: 4, filter: true, tooltipField: 'orgSentence' },
    {
      headerName: '화자',
      field: 'rxtxKind',
      maxWidth: 90,
      flex: 1,
      valueFormatter: (params) => ({ '1': '고객', '2': '상담원', '9': '통합' })[String(params.value)] ?? params.value,
    },
    { headerName: '고유번호(UCID)', field: 'ucidGkey', flex: 3, filter: true, tooltipField: 'ucidGkey' },
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
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">최종 측정 인식률</span>
          {summary?.recogRate != null ? (
            <>
              <span className="text-xl font-bold text-yellow-500 px-1">{summary.recogRate}</span>
              {summary.recogDate && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{dayjs(summary.recogDate).format('YYYY-MM-DD HH:mm:ss')}</span>}
            </>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>
        <Button
          className="ml-auto"
          color="cyan"
          variant="solid"
          onClick={() => {
            if (targetList.length === 0) {
              toast.warning('인식률 측정 데이터가 없습니다. 정답지를 등록해주세요.');
              return;
            }
            recogDrawerRef.current?.open(FIXED_MODEL, engineCode ?? '', groupCode, groupName);
          }}
        >
          인식률 측정
        </Button>
      </div>
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
      <SttRecogDrawer ref={recogDrawerRef} />
    </div>
  );
}
