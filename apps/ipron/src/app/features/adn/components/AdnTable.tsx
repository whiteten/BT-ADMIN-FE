/**
 * ADN 관리 ag-Grid 테이블 — DnTable 패턴.
 * 컬럼: ☐ | 테넌트 | ADN번호 | 상태 | 로그인 ADN | MD5 인증 | MD5 ID | 상담원 기본상태 | 그룹DN | 수정일시
 * 삭제: 체크박스 다중선택 + 툴바 삭제 버튼만 (행별 휴지통 제거)
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { AdnResponse } from '../types';
import { getAdnDftStateName } from '../utils/adnEnums';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface AdnTableProps {
  rowData: AdnResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (adn: AdnResponse) => void;
  onSelectionChanged?: (selected: AdnResponse[]) => void;
  onBulkDelete?: () => void;
  selectedCount?: number;
}

export default function AdnTable({ rowData, isLoading, onRowDoubleClicked, onSelectionChanged, onBulkDelete, selectedCount = 0 }: AdnTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<AdnResponse>[] = useMemo(
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
      { headerName: '테넌트', field: 'tenantName', minWidth: 140 },
      {
        headerName: 'ADN 번호',
        field: 'dnNo',
        minWidth: 110,
        maxWidth: 140,
        cellRenderer: (params: ICellRendererParams<AdnResponse>) => {
          if (!params.data) return null;
          return <span className="font-semibold text-gray-800">{params.data.dnNo}</span>;
        },
      },
      {
        headerName: '상태',
        field: 'dnStatus',
        minWidth: 130,
        maxWidth: 140,
        cellStyle: { textAlign: 'center' } as CellStyle,
        // ADN DN_STATUS: '8'=로그인, '9'=로그아웃 (공유 DnStatus '1' 아님 — DB 실확인)
        filterValueGetter: (params) => (params.data?.dnStatus === '8' ? '로그인' : '로그아웃'),
        cellRenderer: (params: ICellRendererParams<AdnResponse>) => {
          const v = params.data?.dnStatus;
          if (v == null) return '-';
          const isActive = v === '8';
          return (
            <span
              className={`inline-flex items-center justify-center w-[90px] h-[22px] leading-none px-1.5 rounded text-[11px] font-medium ${
                isActive ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-600 bg-gray-50 border border-gray-200'
              }`}
            >
              {isActive ? '로그인' : '로그아웃'}
            </span>
          );
        },
      },
      {
        headerName: '로그인 ADN',
        field: 'loginAdn',
        minWidth: 130,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'MD5 인증',
        field: 'md5Auth',
        minWidth: 110,
        maxWidth: 120,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (params) => (params.data?.md5Auth === 1 ? '설정' : '해제'),
        cellRenderer: (params: ICellRendererParams<AdnResponse>) => {
          const v = params.data?.md5Auth;
          return v === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#e6f4ff', color: '#1677ff' }}>
              설정
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
              해제
            </span>
          );
        },
      },
      { headerName: 'MD5 ID', field: 'md5Authid', minWidth: 110, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '상담원 기본상태',
        field: 'adnDftState',
        minWidth: 140,
        filterValueGetter: (params) => getAdnDftStateName(params.data?.adnDftState),
        valueFormatter: (p) => getAdnDftStateName(p.value),
      },
      {
        headerName: '그룹DN',
        field: 'origGrpdnId',
        minWidth: 140,
        maxWidth: 220,
        valueGetter: (params) => {
          const { origGrpdnNo, origGrpdnName, origGrpdnId } = params.data ?? {};
          if (origGrpdnId == null) return '-';
          if (origGrpdnNo != null) {
            return origGrpdnName != null ? `${origGrpdnNo} (${origGrpdnName})` : origGrpdnNo;
          }
          return String(origGrpdnId);
        },
      },
      { headerName: '수정일시', field: 'workTime', minWidth: 160, flex: 1, valueFormatter: (p) => p.value ?? '-' },
    ],
    [onBulkDelete, selectedCount],
  );

  return (
    <AgGridReact<AdnResponse>
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
