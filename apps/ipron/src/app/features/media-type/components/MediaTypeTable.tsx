/**
 * 미디어타입 사용처 ag-Grid — SkillsetTable 패턴.
 *
 * 컬럼: ☐ | 코드 | 미디어 타입명 | 표시 이름 | 최종 수정 | [휴지통]
 * 다중 선택 일괄 삭제 지원.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { MediaTypeResponse } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  rowData: MediaTypeResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (row: MediaTypeResponse) => void;
  onDelete: (row: MediaTypeResponse) => void;
  onSelectionChanged?: (selected: MediaTypeResponse[]) => void;
  onBulkDelete?: () => void;
  selectedCount?: number;
}

function BulkDeleteHeader({ onBulkDelete, selectedCount }: { onBulkDelete?: () => void; selectedCount: number }) {
  const disabled = selectedCount === 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onBulkDelete?.();
      }}
      title={disabled ? '삭제할 행을 선택하세요' : `선택한 ${selectedCount}건 삭제`}
      className={`flex items-center justify-center w-full h-full ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:text-red-600'}`}
    >
      <IconTrash className="size-5 text-red-500" />
    </button>
  );
}

export default function MediaTypeTable({ rowData, isLoading, onRowDoubleClicked, onDelete, onSelectionChanged, onBulkDelete, selectedCount = 0 }: Props) {
  const { gridOptions } = useAggridOptions();
  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<MediaTypeResponse>[] = useMemo(
    () => [
      {
        headerName: '',
        width: 44,
        maxWidth: 44,
        pinned: 'left',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: '코드',
        field: 'mediaType',
        width: 100,
        maxWidth: 120,
        cellStyle: { textAlign: 'right' } as CellStyle,
      },
      {
        headerName: '미디어 코드명',
        field: 'mediaTypeName',
        flex: 1,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '표시 이름',
        field: 'mediaAlias',
        flex: 1.2,
        minWidth: 200,
      },
      {
        headerName: '최종 수정',
        field: 'workTime',
        width: 170,
        valueFormatter: (p) => (p.value ? String(p.value).replace('T', ' ').slice(0, 16) : '-'),
      },
      {
        headerName: '',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'right',
        headerComponent: () => <BulkDeleteHeader onBulkDelete={onBulkDelete} selectedCount={selectedCount} />,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<MediaTypeResponse>) => {
          const { data } = params;
          if (!data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(data);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [onDelete, onBulkDelete, selectedCount],
  );

  return (
    <AgGridReact<MediaTypeResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowSelection: 'multiple',
        suppressRowClickSelection: true,
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
