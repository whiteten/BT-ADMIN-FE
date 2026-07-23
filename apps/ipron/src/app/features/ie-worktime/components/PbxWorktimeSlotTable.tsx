/**
 * PbxWorktimeSlotTable — ag-Grid 기반 시간대(슬롯) 목록 (하단 영역).
 *
 * 상단 마스터 그리드에서 선택한 업무시간의 하위 시간대만 표시한다.
 * getRowId + focusSeq: 슬롯 저장 후 refetch 돼도 저장된 행 선택/스크롤 유지.
 */
import { useCallback, useMemo } from 'react';
import type { ColDef, GetRowIdParams, RowDataUpdatedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IeWorktimeSlot } from '../types';
import { byteToLabels, displayHHMM } from '../utils/weekday';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  rowData: IeWorktimeSlot[];
  isLoading: boolean;
  focusSeq?: number | null; // rowData 갱신 시 선택/노출할 슬롯 listSeq
  onRowDoubleClicked: (row: IeWorktimeSlot) => void;
  onSelectionChanged: (rows: IeWorktimeSlot[]) => void;
}

export default function PbxWorktimeSlotTable({ rowData, isLoading, focusSeq, onRowDoubleClicked, onSelectionChanged }: Props) {
  const { gridOptions } = useAggridOptions();

  const getRowId = useCallback((p: GetRowIdParams<IeWorktimeSlot>) => `${p.data.worktimeId}-${p.data.listSeq}`, []);

  const handleRowDataUpdated = useCallback(
    (e: RowDataUpdatedEvent<IeWorktimeSlot>) => {
      if (focusSeq == null) return;
      const target = rowData.find((s) => s.listSeq === focusSeq);
      if (!target) return;
      const node = e.api.getRowNode(`${target.worktimeId}-${target.listSeq}`);
      if (node && !node.isSelected()) {
        node.setSelected(true, true);
      }
      if (node) {
        e.api.ensureNodeVisible(node, 'middle');
      }
    },
    [focusSeq, rowData],
  );

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const colDefs: ColDef<IeWorktimeSlot>[] = useMemo(
    () => [
      {
        headerName: '적용요일',
        width: 200,
        valueGetter: (p) => byteToLabels(p.data?.weekdayByte).join('·') || '-',
      },
      { headerName: '시작시간', width: 100, valueGetter: (p) => displayHHMM(p.data?.startTime) },
      { headerName: '종료시간', width: 100, valueGetter: (p) => displayHHMM(p.data?.finishTime) },
      {
        field: 'useYn',
        headerName: '사용여부',
        width: 90,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: { value: number | null }) => (
          <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${p.value === 1 ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
            {p.value === 1 ? '사용' : '미사용'}
          </Badge>
        ),
        filterValueGetter: ({ data }) => (data?.useYn === 1 ? '사용' : '미사용'),
      },
    ],
    [],
  );

  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  return (
    <AgGridReact<IeWorktimeSlot>
      rowData={rowData}
      columnDefs={colDefs}
      defaultColDef={defaultColDef}
      rowSelection={rowSelection}
      getRowId={getRowId}
      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
      loading={isLoading}
      onRowDataUpdated={handleRowDataUpdated}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged(e.api.getSelectedRows())}
    />
  );
}
