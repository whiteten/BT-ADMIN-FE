/**
 * 상담사 ADN 매핑 ag-Grid — AdnTable 패턴.
 * 컬럼: ☐ | 테넌트 | 상담사명 | 로그인 ID | 노드명 | 배정 상태 | ADN | 소속 그룹 | 활성 | 수정일시
 *
 * SWAT IPR20S3011 양쪽 그리드(미배정/배정) 모두 "노드명" 컬럼 표시 (#40).
 * 행 클릭으로 체크박스 토글. 우측 휴지통(삭제로 오해 소지) 컬럼은 제거 —
 * 배정 해제는 상단 일괄 버튼만 사용.
 * 미배정 행은 팔레트 고정색(ROW_COLOR_PALETTE.unassigned = #fff7ed)으로 식별.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, RowSelectionOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { ROW_COLOR_PALETTE } from '../../../components/GridRowColorLegend';
import type { AgentAdnRowResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface AgentAdnTableProps {
  rowData: AgentAdnRowResponse[];
  isLoading?: boolean;
  onSelectionChanged?: (selected: AgentAdnRowResponse[]) => void;
}

export default function AgentAdnTable({ rowData, isLoading, onSelectionChanged }: AgentAdnTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  const columnDefs: ColDef<AgentAdnRowResponse>[] = useMemo(
    () => [
      { headerName: '테넌트', field: 'tenantName', minWidth: 140, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-' },
      { headerName: '상담사명', field: 'agentName', minWidth: 120, tooltipField: 'agentName', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '로그인 ID',
        field: 'agentLoginId',
        minWidth: 130,
        tooltipField: 'agentLoginId',
        cellRenderer: (params: ICellRendererParams<AgentAdnRowResponse>) => <span className="font-mono text-gray-700">{params.value ?? '-'}</span>,
      },
      {
        headerName: '노드명',
        field: 'nodeName',
        minWidth: 140,
        tooltipField: 'nodeName',
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '배정 상태',
        field: 'mappingStatus',
        minWidth: 110,
        maxWidth: 120,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (params) => (params.data?.mappingStatus === 'ASSIGNED' ? '배정' : '미배정'),
        cellRenderer: (params: ICellRendererParams<AgentAdnRowResponse>) => {
          const isAssigned = params.data?.mappingStatus === 'ASSIGNED';
          return (
            <span
              className={`inline-flex items-center justify-center w-[70px] h-[22px] leading-none px-1.5 rounded text-[11px] font-medium ${
                isAssigned ? 'text-green-700 bg-green-50 border border-green-200' : 'text-orange-700 bg-orange-50 border border-orange-200'
              }`}
            >
              {isAssigned ? '배정' : '미배정'}
            </span>
          );
        },
      },
      {
        headerName: 'ADN',
        field: 'pbxLoginId',
        minWidth: 130,
        cellRenderer: (params: ICellRendererParams<AgentAdnRowResponse>) => {
          const v = params.data?.pbxLoginId;
          if (!v) return <span className="text-gray-300">—</span>;
          return <span className="font-mono font-semibold text-[#1e3a8a]">{v}</span>;
        },
      },
      { headerName: '소속 그룹', field: 'groupName', minWidth: 140, tooltipField: 'groupName', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '활성',
        field: 'activateYn',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (params) => (params.data?.activateYn === 1 && (params.data?.retireYn ?? 0) === 0 ? '활성' : '비활성'),
        cellRenderer: (params: ICellRendererParams<AgentAdnRowResponse>) => {
          const isActive = params.data?.activateYn === 1 && (params.data?.retireYn ?? 0) === 0;
          if (!isActive) {
            return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200">비활성</span>;
          }
          return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200">활성</span>;
        },
      },
      { headerName: '수정일시', field: 'workTime', minWidth: 160, flex: 1, valueFormatter: (p) => p.value ?? '-' },
    ],
    [],
  );

  return (
    <div className="h-full">
      <style>{`
        .ag-row-unassigned { background-color: ${ROW_COLOR_PALETTE.unassigned} !important; }
        .ag-row-unassigned:hover { background-color: #e2e8f0 !important; }
      `}</style>
      <AgGridReact<AgentAdnRowResponse>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        gridOptions={{
          ...gridOptions,
          statusBar: undefined,
          pagination: false,
          sideBar: false,
          getRowClass: (params) => (params.data?.mappingStatus === 'UNASSIGNED' ? 'ag-row-unassigned' : ''),
        }}
        rowSelection={rowSelection}
        loading={isLoading}
        onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
      />
    </div>
  );
}
