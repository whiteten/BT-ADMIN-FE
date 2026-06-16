/**
 * 내선 프로파일 ag-Grid 테이블
 * AS-IS IPR20S2220 컬럼과 동일 순서 유지
 *
 * 컬럼: 내선프로파일ID | 내선프로파일 | 내선프로파일유형 | DR노드 | 글로벌여부 |
 *      긴급코드 | 기능코드 | 접근코드 | SIP 프로파일 | 로컬라우트 |
 *      미디어 전달 그룹 | RTP 중개 | MS 그룹 | NAT | [DN 배정]
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, RowSelectionOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { ListPlus } from 'lucide-react';
import { BOOL_OX_LABEL } from '../../dn/utils/dnEnums';
import type { DnProfile } from '../types';
import { DN_PROFILE_TYPE_LABELS, NAT_OPTION_LABELS, getRtpLabel } from '../utils/dnProfileEnums';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DnProfileTableProps {
  rowData: DnProfile[];
  isLoading?: boolean;
  onRowDoubleClicked: (profile: DnProfile) => void;
  onSelectionChanged?: (selectedProfiles: DnProfile[]) => void;
  onAssignDns?: (profile: DnProfile) => void;
}

export default function DnProfileTable({ rowData, isLoading, onRowDoubleClicked, onSelectionChanged, onAssignDns }: DnProfileTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
      enableSelectionWithoutKeys: true,
    }),
    [],
  );

  const columnDefs: ColDef<DnProfile>[] = useMemo(
    () => [
      {
        headerName: '내선프로파일 ID',
        field: 'dnProfileId',
        minWidth: 120,
        maxWidth: 140,
        cellStyle: { textAlign: 'center' } as CellStyle,
        hide: true, // 기본 숨김 — 그리드 우클릭 "Choose Columns"에서 on/off 가능
      },
      {
        headerName: '내선프로파일',
        field: 'dnProfileName',
        minWidth: 160,
        flex: 1.2,
        tooltipField: 'dnProfileName',
        cellRenderer: (params: ICellRendererParams<DnProfile>) => {
          if (!params.data) return null;
          return <span className="font-semibold text-gray-800">{params.data.dnProfileName}</span>;
        },
      },
      {
        headerName: '내선프로파일 유형',
        field: 'dnProfileType',
        minWidth: 130,
        maxWidth: 150,
        // 라벨 기준으로 정렬 되도록 valueGetter 사용
        valueGetter: (params) => {
          const v = params.data?.dnProfileType;
          return v ? DN_PROFILE_TYPE_LABELS[v as '0' | '1'] : '-';
        },
      },
      {
        headerName: 'DR노드',
        field: 'drNodeName',
        minWidth: 80,
        maxWidth: 100,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '글로벌여부',
        field: 'globalDnYn',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (params) => BOOL_OX_LABEL(params.data?.globalDnYn == null ? params.data?.globalDnYn : params.data.globalDnYn ? 1 : 0),
        valueFormatter: (params) => BOOL_OX_LABEL(params.value),
      },
      {
        headerName: '긴급코드',
        field: 'emergencyCodeProfileName',
        minWidth: 120,
        flex: 1,
        tooltipField: 'emergencyCodeProfileName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '기능코드',
        field: 'devfuncCodeProfileName',
        minWidth: 120,
        flex: 1,
        tooltipField: 'devfuncCodeProfileName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '접근코드',
        field: 'accessCodeProfileName',
        minWidth: 120,
        flex: 1,
        tooltipField: 'accessCodeProfileName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'SIP 프로파일',
        field: 'sipProfileName',
        minWidth: 120,
        flex: 1,
        tooltipField: 'sipProfileName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '로컬라우트',
        field: 'localRouteName',
        minWidth: 110,
        flex: 1,
        tooltipField: 'localRouteName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '미디어 전달 그룹',
        field: 'mediaDeliveryName',
        minWidth: 130,
        flex: 1,
        tooltipField: 'mediaDeliveryName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'RTP 중개',
        field: 'rtpOption',
        minWidth: 110,
        valueGetter: (params) => {
          const d = params.data;
          if (!d) return '-';
          return getRtpLabel(d.dnProfileType, d.rtpOption ?? 0);
        },
      },
      {
        headerName: 'MS 그룹',
        field: 'msGroupName',
        minWidth: 110,
        tooltipField: 'msGroupName',
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: 'NAT',
        field: 'natOption',
        minWidth: 100,
        maxWidth: 140,
        filterValueGetter: (params) => (params.data?.natOption ? NAT_OPTION_LABELS[params.data.natOption as '0' | '1' | '2' | '3' | '4'] : '-'),
        valueFormatter: (params) => (params.value ? NAT_OPTION_LABELS[params.value as '0' | '1' | '2' | '3' | '4'] : '-'),
      },
      {
        headerName: 'DN 배정',
        maxWidth: 90,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'right',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        hide: !onAssignDns,
        cellRenderer: (params: ICellRendererParams<DnProfile>) => {
          const { data } = params;
          if (!data) return null;
          return (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onAssignDns?.(data);
              }}
            >
              <ListPlus className="size-4" />
              <span>배정</span>
            </button>
          );
        },
      },
    ],
    [onAssignDns],
  );

  return (
    <AgGridReact<DnProfile>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
      rowSelection={rowSelection}
      loading={isLoading}
      onRowDoubleClicked={(e) => {
        if (e.data) onRowDoubleClicked(e.data);
      }}
      onSelectionChanged={(e) => {
        const selected = e.api.getSelectedRows();
        onSelectionChanged?.(selected);
      }}
    />
  );
}
