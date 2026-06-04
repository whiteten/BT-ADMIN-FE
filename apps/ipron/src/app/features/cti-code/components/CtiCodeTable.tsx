/**
 * CtiCodeTable — ag-Grid 기반 사유 코드 목록 테이블 (Phase 1 stub).
 * TODO Phase 2: 컬럼 정의 및 편집 기능 구현
 */
import { useRef } from 'react';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Popconfirm } from 'antd';
import { Trash2 } from 'lucide-react';
import type { ReasonCodeResponse } from '../types';

interface Props {
  rowData: ReasonCodeResponse[];
  isLoading: boolean;
  onRowDoubleClicked: (row: ReasonCodeResponse) => void;
  onDelete: (row: ReasonCodeResponse) => void;
  onSelectionChanged: (rows: ReasonCodeResponse[]) => void;
  onBulkDelete: () => void;
  selectedCount: number;
  showTenantColumn: boolean;
}

export default function CtiCodeTable({ rowData, isLoading, onRowDoubleClicked, onDelete, onSelectionChanged, onBulkDelete, selectedCount, showTenantColumn }: Props) {
  const gridRef = useRef(null);

  const colDefs: ColDef<ReasonCodeResponse>[] = [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 40, pinned: 'left', resizable: false, sortable: false, filter: false, suppressHeaderMenuButton: true },
    ...(showTenantColumn ? [{ field: 'tenantName' as const, headerName: '테넌트', minWidth: 140, flex: 1 }] : []),
    { field: 'reasonName' as const, headerName: '사유명', flex: 2, minWidth: 160 },
    { field: 'reasonCode' as const, headerName: '코드', width: 110, maxWidth: 130 },
    {
      headerName: '삭제',
      width: 70,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: (params: { data?: ReasonCodeResponse }) =>
        params.data ? (
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => onDelete(params.data!)} okText="삭제" cancelText="취소">
            <Button type="text" danger size="small" icon={<Trash2 className="size-3" />} />
          </Popconfirm>
        ) : null,
    },
  ];

  const gridOptions: GridOptions<ReasonCodeResponse> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true },
    rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true },
    onSelectionChanged: (e) => onSelectionChanged(e.api.getSelectedRows()),
    onRowDoubleClicked: (e) => e.data && onRowDoubleClicked(e.data),
  };

  return (
    <div className="flex flex-col h-full gap-1">
      {selectedCount > 0 && (
        <div className="flex justify-end px-1">
          <Popconfirm title={`${selectedCount}건을 삭제하시겠습니까?`} onConfirm={onBulkDelete} okText="삭제" cancelText="취소">
            <Button danger size="small" icon={<Trash2 className="size-3" />}>
              선택 삭제 ({selectedCount})
            </Button>
          </Popconfirm>
        </div>
      )}
      <div className="flex-1 ag-theme-quartz">
        <AgGridReact<ReasonCodeResponse> ref={gridRef} rowData={rowData} columnDefs={colDefs} gridOptions={gridOptions} loading={isLoading} />
      </div>
    </div>
  );
}
