/**
 * DN 관리 ag-Grid 테이블 (IPR20S2020)
 * 20 컬럼 + 체크박스 다건 선택 + 더블클릭 → 수정 페이지
 *
 * 컬럼: ☐ | DN번호 | 유형 | 상태 | 내선프로파일 | COS | DR노드 | Global |
 *      IP | MD5 ID | 전송유형 | 단말기 | 로그인ADN | 사용자명 |
 *      블럭 | 착금 | 발금 | 개별발신번호 | [휴지통]
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { DnResponse } from '../types';
import { BOOL_OX_LABEL, DN_STATUS_LABELS, TRANSPORT_TYPE_LABELS } from '../utils/dnEnums';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DnTableProps {
  rowData: DnResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (dn: DnResponse) => void;
  onDelete: (dn: DnResponse) => void;
  onSelectionChanged?: (selected: DnResponse[]) => void;
  onBulkDelete?: () => void;
  selectedCount?: number;
}

// 헤더용 일괄삭제 버튼 — 선택 건수 0이면 disable
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

export default function DnTable({ rowData, isLoading, onRowDoubleClicked, onDelete, onSelectionChanged, onBulkDelete, selectedCount = 0 }: DnTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<DnResponse>[] = useMemo(
    () => [
      // 체크박스 컬럼
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
        headerName: '내선프로파일ID',
        field: 'dnProfileId',
        minWidth: 120,
        hide: true, // 기본 숨김 — 그리드 우클릭 "Choose Columns"에서 on/off
      },
      {
        headerName: 'DN번호',
        field: 'dnNo',
        minWidth: 110,
        maxWidth: 140,
        cellRenderer: (params: ICellRendererParams<DnResponse>) => {
          if (!params.data) return null;
          return <span className="font-semibold text-gray-800">{params.data.dnNo}</span>;
        },
      },
      {
        // 갭3: dnTypeName 컬럼 — EDN 전용 화면이므로 항상 '내선' 표시
        headerName: '유형',
        field: 'dnTypeName',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (params) => params.value ?? '내선',
      },
      {
        headerName: '상태',
        field: 'dnStatus',
        minWidth: 140,
        maxWidth: 150,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueGetter: (params) => {
          const v = params.data?.dnStatus;
          return v ? DN_STATUS_LABELS[v] : '-';
        },
        cellRenderer: (params: ICellRendererParams<DnResponse>) => {
          const v = params.data?.dnStatus;
          if (!v) return '-';
          const isActive = v === '1';
          return (
            <span
              className={`inline-flex items-center justify-center w-[110px] h-[22px] leading-none px-1.5 rounded text-[11px] font-medium ${
                isActive ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'
              }`}
            >
              {DN_STATUS_LABELS[v]}
            </span>
          );
        },
      },
      {
        headerName: '내선프로파일',
        field: 'dnProfileName',
        minWidth: 140,
        flex: 1,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'COS',
        field: 'cosName',
        minWidth: 130,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'DR노드',
        field: 'backUpNodeName',
        minWidth: 100,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'Global',
        field: 'globalDnYn',
        minWidth: 80,
        maxWidth: 90,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (params) => BOOL_OX_LABEL(params.value),
      },
      {
        headerName: 'IP',
        minWidth: 140,
        valueGetter: (params) => {
          const d = params.data;
          if (!d) return '-';
          return d.ipv4Address || d.ipv6Address || '-';
        },
      },
      {
        headerName: 'MD5 ID',
        field: 'md5Authid',
        minWidth: 110,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '전송유형',
        field: 'transportType',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueGetter: (params) => {
          const v = params.data?.transportType;
          return v ? TRANSPORT_TYPE_LABELS[v] : '-';
        },
      },
      {
        headerName: '단말기',
        field: 'deviceTypeName',
        minWidth: 100,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        // 갭1: 로그인ADN 컬럼 — SWAT IPR20S2020 그리드 loginAdn 컬럼
        headerName: '로그인ADN',
        field: 'loginAdn',
        minWidth: 120,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        // 갭2: 사용자명 컬럼 — SWAT IPR20S2020 그리드 ieUserName 컬럼
        headerName: '사용자명',
        field: 'ieUserName',
        minWidth: 120,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '블럭',
        field: 'extBlockYn',
        minWidth: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (params) => BOOL_OX_LABEL(params.value),
      },
      {
        headerName: '착금',
        field: 'dnTblYn',
        minWidth: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (params) => BOOL_OX_LABEL(params.value),
      },
      {
        headerName: '발금',
        field: 'dnOblYn',
        minWidth: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (params) => BOOL_OX_LABEL(params.value),
      },
      {
        headerName: '개별발신번호',
        field: 'dodAni',
        minWidth: 120,
        valueFormatter: (params) => params.value ?? '-',
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
        cellRenderer: (params: ICellRendererParams<DnResponse>) => {
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
    <AgGridReact<DnResponse>
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
      onRowDoubleClicked={(e) => {
        if (e.data) onRowDoubleClicked(e.data);
      }}
      onSelectionChanged={(e) => {
        if (onSelectionChanged) {
          const selected = e.api.getSelectedRows();
          onSelectionChanged(selected);
        }
      }}
    />
  );
}
