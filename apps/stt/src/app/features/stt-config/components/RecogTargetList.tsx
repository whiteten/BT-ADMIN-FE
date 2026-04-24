import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { toast } from '@/shared-util';
import { recogQueryKeys, useDeleteRecogTargets, useGetRecogTargetList, useMeasureRecogAccuracy } from '../hooks/useRecogQueries';
import type { RecogAccuracyResult, RecogTargetListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 20;

interface RecogTargetListProps {
  groupCode: string;
}

export default function RecogTargetList({ groupCode }: RecogTargetListProps) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const gridRef = useRef<AgGridReact<RecogTargetListItem>>(null);
  const { gridOptions } = useAggridOptions();

  const [searchValue, setSearchValue] = useState('');
  const [measureResult, setMeasureResult] = useState<RecogAccuracyResult | null>(null);

  const { data: targetList = [], isLoading } = useGetRecogTargetList(groupCode);

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return targetList;
    const keyword = searchValue.toLowerCase();
    return targetList.filter((t) => t.sentence.toLowerCase().includes(keyword) || t.ucidGkey.toLowerCase().includes(keyword));
  }, [targetList, searchValue]);

  const { mutate: deleteTargets, isPending: isDeleting } = useDeleteRecogTargets({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogTargetList(groupCode).queryKey });
        gridRef.current?.api?.deselectAll();
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const { mutate: measureAccuracy, isPending: isMeasuring } = useMeasureRecogAccuracy({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success('인식률 측정이 완료되었습니다.');
        setMeasureResult(result as RecogAccuracyResult);
      },
      onError: () => {
        toast.error('인식률 측정에 실패했습니다.');
      },
    },
  });

  const handleBulkDelete = () => {
    const selectedIds = gridRef.current?.api?.getSelectedRows().map((r) => r.id) ?? [];
    if (selectedIds.length === 0) {
      toast.warning('삭제할 항목을 선택해주세요.');
      return;
    }
    modal.confirm.delete({ onOk: () => deleteTargets(selectedIds) });
  };

  const handleMeasure = () => {
    measureAccuracy(groupCode);
  };

  const columnDefs: ColDef<RecogTargetListItem>[] = [
    {
      headerName: '',
      colId: 'checkbox',
      width: 48,
      maxWidth: 48,
      sortable: false,
      filter: false,
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    { headerName: 'TEXT', field: 'sentence', flex: 4, tooltipField: 'sentence' },
    { headerName: '화자', field: 'rxtxKind', maxWidth: 90 },
    { headerName: 'UCID_GKEY', field: 'ucidGkey', flex: 3, tooltipField: 'ucidGkey' },
    { headerName: '등록일', field: 'workTime', flex: 2 },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[20px] font-bold text-[var(--color-bt-primary)]">정답지 목록</span>
          {measureResult && (
            <span className="text-sm text-[#495057]">
              최종 측정 인식률 : <span className="text-orange-500 font-bold">{measureResult.score}</span> <span className="text-[#6c757d]">[{measureResult.measuredAt}]</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="문장 또는 UCID 검색" allowClear style={{ width: 220 }} />
          <Button color="orange" variant="solid" loading={isDeleting} onClick={handleBulkDelete}>
            삭제
          </Button>
          <Button color="cyan" variant="solid" loading={isMeasuring} onClick={handleMeasure}>
            인식률측정
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[200px]">
        <AgGridReact<RecogTargetListItem>
          ref={gridRef}
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
            rowSelection: 'multiple',
          }}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
