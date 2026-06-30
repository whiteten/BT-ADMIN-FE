import { useEffect, useRef } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, type InputRef } from 'antd';
import type { ReceiveTargetFormField } from '../types/receiveTargetForm';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface InputTextCellEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  cellStartedEdit?: boolean;
}

function InputTextCellEditor({ value = '', onValueChange, placeholder = '', cellStartedEdit }: InputTextCellEditorProps) {
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (cellStartedEdit) {
      inputRef.current?.focus();
    }
  }, [cellStartedEdit]);

  return <Input ref={inputRef} value={value} placeholder={placeholder} onChange={(e) => onValueChange(e.target.value)} />;
}

const columnDefs: ColDef<ReceiveTargetFormField>[] = [
  {
    headerName: '',
    colId: 'rowIndex',
    width: 56,
    valueGetter: (params) => (params.node?.rowIndex != null ? params.node.rowIndex + 1 : ''),
    sortable: false,
    filter: false,
    suppressHeaderMenuButton: true,
  },
  { headerName: '필드명', field: 'fieldName', width: 140, sortable: false, filter: false },
  {
    headerName: '값',
    field: 'value',
    flex: 1,
    minWidth: 200,
    editable: true,
    cellEditor: InputTextCellEditor,
    cellEditorParams: { placeholder: '값을 입력하세요.' },
  },
  { headerName: '타입', field: 'dataType', width: 160, sortable: false, filter: false },
  { headerName: '설명', field: 'description', flex: 1, minWidth: 120, sortable: false, filter: false },
];

type ReceiveTargetInfoGridProps = {
  rowData: ReceiveTargetFormField[];
  onValueChange: (fieldId: string, value: string) => void;
};

export default function ReceiveTargetInfoGrid({ rowData, onValueChange }: ReceiveTargetInfoGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="w-full h-[480px]">
      <AgGridReact<ReceiveTargetFormField>
        rowModelType="clientSide"
        rowData={rowData}
        getRowId={(params) => params.data.fieldId}
        columnDefs={columnDefs}
        gridOptions={{
          ...gridOptions,
          sideBar: false,
          rowNumbers: false,
          singleClickEdit: true,
          stopEditingWhenCellsLoseFocus: true,
        }}
        onCellValueChanged={(event) => {
          if (!event.data || event.colDef.field !== 'value') return;
          onValueChange(event.data.fieldId, event.newValue ?? '');
        }}
      />
    </div>
  );
}
