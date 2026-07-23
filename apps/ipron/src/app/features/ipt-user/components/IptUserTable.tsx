/**
 * IPT 사용자관리 ag-Grid 테이블.
 *
 * 컬럼: ☐ | 조직명 | 사용자ID | 사용자명 | 단말기표시이름 | 핸드폰 | 직급 | 직책 | DN번호 | 녹취 | 활성화 | [휴지통]
 * 행 더블클릭 → 수정 Drawer.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, RowSelectionOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IptUserResponse } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface IptUserTableProps {
  rowData: IptUserResponse[];
  isLoading?: boolean;
  /** 테넌트 컬럼 표시 (가시 테넌트 2개 이상일 때만) */
  showTenant?: boolean;
  onRowDoubleClicked: (user: IptUserResponse) => void;
  onDelete: (user: IptUserResponse) => void;
  onSelectionChanged?: (selected: IptUserResponse[]) => void;
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

export default function IptUserTable({
  rowData,
  isLoading,
  showTenant = false,
  onRowDoubleClicked,
  onDelete,
  onSelectionChanged,
  onBulkDelete,
  selectedCount = 0,
}: IptUserTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  const columnDefs: ColDef<IptUserResponse>[] = useMemo(
    () => [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 100, hide: !showTenant, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-' },
      { headerName: '조직명', field: 'dnGrpName', flex: 1.1, minWidth: 110, tooltipField: 'dnGrpName', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '사용자ID',
        field: 'userId',
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams<IptUserResponse>) => (params.data ? <span className="font-semibold text-gray-800">{params.data.userId}</span> : null),
      },
      { headerName: '사용자명', field: 'userName', flex: 1, minWidth: 100, tooltipField: 'userName' },
      { headerName: '단말기표시이름', field: 'clidName', flex: 1, minWidth: 110, tooltipField: 'clidName', valueFormatter: (p) => p.value ?? '-' },
      { headerName: '핸드폰', field: 'mobileNo', flex: 1, minWidth: 110, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '직급', field: 'userLevelName', flex: 0.7, minWidth: 80, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '직책', field: 'dutiesName', flex: 0.7, minWidth: 80, valueFormatter: (p) => p.value ?? '-' },
      { headerName: 'DN번호', field: 'dnNo', flex: 0.9, minWidth: 90, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '녹취',
        field: 'autoMdYn',
        flex: 0.6,
        minWidth: 70,
        valueGetter: (p) => (p.data?.dnId == null ? '-' : p.data.autoMdYn === 1 ? '사용' : '미사용'),
      },
      {
        headerName: '활성화',
        field: 'activateYn',
        flex: 0.7,
        minWidth: 80,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        valueGetter: (p) => (p.data?.activateYn === 1 ? '활성' : '비활성'),
        cellRenderer: (params: ICellRendererParams<IptUserResponse>) => {
          const on = params.data?.activateYn === 1;
          return (
            <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${on ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
              {on ? '활성' : '비활성'}
            </Badge>
          );
        },
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
        cellRenderer: (params: ICellRendererParams<IptUserResponse>) => {
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
    [onDelete, onBulkDelete, selectedCount, showTenant],
  );

  return (
    <AgGridReact<IptUserResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
      rowSelection={rowSelection}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
