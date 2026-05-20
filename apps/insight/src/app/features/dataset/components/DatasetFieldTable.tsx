import { useCallback, useRef, useState } from 'react';
import type { CellValueChangedEvent, ColDef, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { toast } from '@/shared-util';
import { useUpdateFieldDisplays } from '../../report/hooks/useReportQueries';
import type { ColumnFormat, FieldDisplay, FieldType } from '../../report/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const FIELD_TYPE_OPTIONS = [
  { value: 'DIM', label: 'DIM' },
  { value: 'MSR', label: 'MSR' },
];

const FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'Number', label: 'Number (정수)' },
  { value: 'Decimal', label: 'Decimal (소수)' },
  { value: 'Rate', label: 'Rate (%)' },
  { value: 'String', label: 'String (문자)' },
  { value: 'Date', label: 'Date (날짜)' },
  { value: 'Time', label: 'Time (시간)' },
];

interface DatasetFieldTableProps {
  reportId: number;
  fieldDisplays: FieldDisplay[];
}

export default function DatasetFieldTable({ reportId, fieldDisplays }: DatasetFieldTableProps) {
  const [rowData, setRowData] = useState<FieldDisplay[]>(fieldDisplays);
  const { gridOptions } = useAggridOptions();

  const { mutate: updateFieldDisplays } = useUpdateFieldDisplays({
    mutationOptions: {
      onSuccess: () => toast.success('필드 설정이 저장되었습니다.'),
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<FieldDisplay>) => {
      const updated = rowData.map((row) => (row.fieldName === event.data.fieldName ? { ...row, ...event.data } : row));
      setRowData(updated);
      updateFieldDisplays({ reportId, data: updated });
    },
    [rowData, reportId, updateFieldDisplays],
  );

  const columnDefs: ColDef<FieldDisplay>[] = [
    {
      field: 'fieldName',
      headerName: '컬럼',
      width: 160,
      editable: false,
      cellClass: 'font-mono text-[11px]',
    },
    {
      field: 'isVisible',
      headerName: '노출',
      width: 70,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
    },
    {
      field: 'fieldType',
      headerName: '종류',
      width: 90,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: FIELD_TYPE_OPTIONS.map((o) => o.value) },
      cellRenderer: (params: { value: FieldType }) => {
        const color = params.value === 'DIM' ? 'text-bt-primary bg-bt-primary-soft' : 'text-bt-fg-muted bg-bt-bg-muted';
        return `<span class="rounded px-1.5 py-0.5 text-[10px] font-semibold ${color}">${params.value ?? ''}</span>`;
      },
    },
    {
      field: 'columnFormat',
      headerName: '서식',
      width: 130,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: FORMAT_OPTIONS.map((o) => o.value) },
    },
    {
      field: 'displayName',
      headerName: '표시명',
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor',
    },
  ];

  return (
    <AgGridReact<FieldDisplay>
      {...gridOptions}
      rowData={rowData}
      columnDefs={columnDefs}
      onCellValueChanged={handleCellValueChanged}
      stopEditingWhenCellsLoseFocus
      singleClickEdit
    />
  );
}
