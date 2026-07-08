/**
 * 상담사 관리 ag-Grid 테이블.
 *
 * 컬럼: ☐ | 테넌트 | 그룹 | 로그인ID | 상담사명 | 별명 | 직급 | 활성 | 상태 | 수정일시 | [휴지통]
 *
 * 행 드래그앤드롭 → 좌측 그룹 트리 노드에 드롭하면 onAgentDrop(agentIds, targetGroupId) 호출.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, RowSelectionOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { GripVertical } from 'lucide-react';
import { labelOfActivate, labelOfAgentGrade, labelOfJikgup } from '../constants/codes';
import type { AgentResponse } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * D&D 채널 — AgentGroupTree.onDrop 과 협의된 MIME 타입.
 * 페이로드: JSON 배열 형태의 agentId 들.
 */
export const AGENT_DRAG_MIME = 'application/x-bt-agent-ids';

interface AgentMasterTableProps {
  rowData: AgentResponse[];
  isLoading?: boolean;
  /** 테넌트 컬럼 표시 여부(운영자 모드 전체/대행 시에만 true). 일반 콘솔은 단일 테넌트라 숨김. */
  showTenant?: boolean;
  onRowDoubleClicked: (agent: AgentResponse) => void;
  onDelete: (agent: AgentResponse) => void;
  onSelectionChanged?: (selected: AgentResponse[]) => void;
  onBulkDelete?: () => void;
  selectedCount?: number;
  /**
   * drag start 시점에 dataTransfer 에 실어 보낼 agentId 배열 결정.
   * 보통: 선택된 행이 있으면 그 ID 들, 없으면 드래그된 단일 행만.
   */
  getDragAgentIds?: (dragRow: AgentResponse) => number[];
  /** 드래그 시작 — 트리가 크로스테넌트 여부를 dragover 중에 판정할 수 있도록 대상 agentId 통지. */
  onDragStartAgents?: (agentIds: number[]) => void;
  /** 드래그 종료 — 트리 판정 상태 초기화. */
  onDragEndAgents?: () => void;
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

export default function AgentMasterTable({
  rowData,
  isLoading,
  showTenant = false,
  onRowDoubleClicked,
  onDelete,
  onSelectionChanged,
  onBulkDelete,
  selectedCount = 0,
  getDragAgentIds,
  onDragStartAgents,
  onDragEndAgents,
}: AgentMasterTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  const columnDefs: ColDef<AgentResponse>[] = useMemo(
    () => [
      {
        headerName: '',
        width: 28,
        maxWidth: 28,
        pinned: 'left',
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div
              draggable
              onDragStart={(e) => {
                const ids = getDragAgentIds?.(data) ?? [data.agentId];
                e.dataTransfer.setData(AGENT_DRAG_MIME, JSON.stringify(ids));
                e.dataTransfer.effectAllowed = 'move';
                onDragStartAgents?.(ids);
              }}
              onDragEnd={() => onDragEndAgents?.()}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600"
              title="드래그하여 상담그룹 이동"
            >
              <GripVertical className="size-3.5" />
            </div>
          );
        },
      },
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 100, hide: !showTenant, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-' },
      { headerName: '그룹', field: 'groupName', flex: 1.2, minWidth: 110, tooltipField: 'groupName', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '로그인 ID',
        field: 'agentLoginId',
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => (params.data ? <span className="font-semibold text-gray-800">{params.data.agentLoginId}</span> : null),
      },
      {
        headerName: 'ADN',
        field: 'pbxLoginId',
        flex: 0.8,
        minWidth: 80,
        valueFormatter: (p) => p.value ?? '-',
      },
      { headerName: '상담사명', field: 'agentName', flex: 1, minWidth: 100, tooltipField: 'agentName' },
      {
        headerName: '아웃소싱업체',
        field: 'oscomName',
        flex: 1,
        minWidth: 120,
        tooltipField: 'oscomName',
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '상담등급',
        field: 'agentGrade',
        flex: 0.9,
        minWidth: 100,
        valueGetter: (p) => labelOfAgentGrade(p.data?.agentGrade),
      },
      {
        headerName: '직급',
        field: 'jikgup',
        flex: 0.7,
        minWidth: 80,
        valueGetter: (p) => labelOfJikgup(p.data?.jikgup),
      },
      {
        headerName: '활성화',
        field: 'activateYn',
        flex: 0.7,
        minWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueGetter: (p) => labelOfActivate(p.data?.activateYn),
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const v = params.data?.activateYn;
          const on = v === 1;
          return (
            <span
              className={`inline-flex items-center justify-center w-[52px] h-[20px] leading-none px-1.5 rounded text-[11px] font-medium ${
                on ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-600 bg-gray-50 border border-gray-200'
              }`}
            >
              {on ? '활성' : '비활성'}
            </span>
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
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
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
    <AgGridReact<AgentResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowDragManaged: false,
        rowDragMultiRow: true,
      }}
      rowSelection={rowSelection}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
