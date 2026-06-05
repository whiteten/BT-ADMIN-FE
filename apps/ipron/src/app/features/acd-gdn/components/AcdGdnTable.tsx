/**
 * ACD 그룹DN ag-Grid 테이블 — AdnTable 패턴.
 *
 * 컬럼: ☐ | 테넌트 | 그룹DN번호 | 이름 | ACD | ACD타입 | 라우팅 | 최대대기호/시간 | 헌팅 | 블록 | 멤버수 | [휴지통]
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type GdnResponse, getAcdTypeName, getRoutingKindName } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface AcdGdnTableProps {
  rowData: GdnResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (gdn: GdnResponse) => void;
  onRowClicked?: (gdn: GdnResponse) => void;
  onDelete: (gdn: GdnResponse) => void;
  onSelectionChanged?: (selected: GdnResponse[]) => void;
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

function YnPill({ value }: { value: number | null }) {
  const active = value === 1;
  return (
    <span
      className={`inline-flex items-center justify-center w-[42px] h-[20px] leading-none rounded text-[11px] font-medium ${
        active ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-500 bg-gray-50 border border-gray-200'
      }`}
    >
      {active ? 'ON' : 'OFF'}
    </span>
  );
}

export default function AcdGdnTable({ rowData, isLoading, onRowDoubleClicked, onRowClicked, onDelete, onSelectionChanged, onBulkDelete, selectedCount = 0 }: AcdGdnTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<GdnResponse>[] = useMemo(
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
      { headerName: '테넌트', field: 'tenantName', minWidth: 140, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '그룹DN 번호',
        field: 'gdnNo',
        minWidth: 110,
        maxWidth: 140,
        cellRenderer: (params: ICellRendererParams<GdnResponse>) => {
          if (!params.data) return null;
          return <span className="font-mono font-semibold text-gray-800">{params.data.gdnNo}</span>;
        },
      },
      { headerName: '그룹DN 이름', field: 'gdnName', minWidth: 160, flex: 1 },
      {
        headerName: 'ACD',
        field: 'acdYn',
        minWidth: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<GdnResponse>) => <YnPill value={p.data?.acdYn ?? null} />,
      },
      {
        headerName: 'ACD 타입',
        field: 'acdType',
        minWidth: 140,
        valueFormatter: (p) => getAcdTypeName(p.value),
      },
      {
        headerName: '라우팅',
        field: 'routingKind',
        minWidth: 100,
        valueFormatter: (p) => getRoutingKindName(p.value),
      },
      {
        headerName: '최대대기호',
        field: 'maxWaitcnt',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '대기시간(s)',
        field: 'maxWaittime',
        minWidth: 100,
        maxWidth: 110,
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '헌팅',
        field: 'huntingYn',
        minWidth: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<GdnResponse>) => <YnPill value={p.data?.huntingYn ?? null} />,
      },
      {
        headerName: '블록',
        field: 'blockYn',
        minWidth: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<GdnResponse>) => {
          const v = p.data?.blockYn ?? null;
          const set = v === 1;
          return (
            <span
              className={`inline-flex items-center justify-center w-[42px] h-[20px] leading-none rounded text-[11px] font-medium ${
                set ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-gray-500 bg-gray-50 border border-gray-200'
              }`}
            >
              {set ? '설정' : '해제'}
            </span>
          );
        },
      },
      {
        headerName: '멤버수',
        field: 'memberCount',
        minWidth: 80,
        maxWidth: 100,
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : Number(p.value).toLocaleString()),
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
        cellRenderer: (params: ICellRendererParams<GdnResponse>) => {
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
    <AgGridReact<GdnResponse>
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
      onRowClicked={(e) => e.data && onRowClicked?.(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
