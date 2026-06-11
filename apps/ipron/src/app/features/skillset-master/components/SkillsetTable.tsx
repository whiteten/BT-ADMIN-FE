/**
 * 스킬셋 마스터 ag-Grid — AdnTable 패턴.
 *
 * 컬럼: ☐ | 테넌트 | 업무그룹 | 스킬셋ID | 스킬셋명 | 미디어타입 | 정렬 | 상담사수 | 활성 | 설명 | [휴지통]
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { CalendarClock, GripVertical } from 'lucide-react';
import { type SkillsetResponse, getMediaTypeName } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/** D&D 채널 — SkillsetGroupTree.onDrop 과 협의된 MIME. 페이로드: JSON skillsetId 배열. */
export const SKILLSET_DRAG_MIME = 'application/x-bt-skillset-ids';

interface Props {
  rowData: SkillsetResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (row: SkillsetResponse) => void;
  onDelete: (row: SkillsetResponse) => void;
  /** 스케줄 관리 drawer 열기 */
  onManageSchedule?: (row: SkillsetResponse) => void;
  onSelectionChanged?: (selected: SkillsetResponse[]) => void;
  onBulkDelete?: () => void;
  selectedCount?: number;
  /** drag 시점에 dataTransfer 에 실어 보낼 skillsetId 배열 결정. 선택된 게 있으면 그것, 없으면 단건. */
  getDragSkillsetIds?: (dragRow: SkillsetResponse) => number[];
  /** 테넌트 컬럼 표시 여부 (default true). false 면 한 테넌트 모드에서 컬럼 숨김. */
  showTenantColumn?: boolean;
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
      {active ? '활성' : '비활성'}
    </span>
  );
}

export default function SkillsetTable({
  rowData,
  isLoading,
  onRowDoubleClicked,
  onDelete,
  onManageSchedule,
  onSelectionChanged,
  onBulkDelete,
  selectedCount = 0,
  getDragSkillsetIds,
  showTenantColumn = true,
}: Props) {
  const { gridOptions } = useAggridOptions();
  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: false, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<SkillsetResponse>[] = useMemo(
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
        cellRenderer: (params: ICellRendererParams<SkillsetResponse>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div
              draggable
              onDragStart={(e) => {
                const ids = getDragSkillsetIds?.(data) ?? [data.skillsetId];
                e.dataTransfer.setData(SKILLSET_DRAG_MIME, JSON.stringify(ids));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600"
              title="드래그하여 업무그룹 이동"
            >
              <GripVertical className="size-3.5" />
            </div>
          );
        },
      },
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 140, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-', hide: !showTenantColumn },
      {
        headerName: '업무그룹',
        field: 'treeName',
        flex: 1,
        minWidth: 150,
        tooltipField: 'treeName',
        cellRenderer: (p: ICellRendererParams<SkillsetResponse>) => {
          const v = p.data?.treeName;
          if (!v) return <span className="text-red-500 text-xs">미배정</span>;
          return <span className="text-gray-800">{v}</span>;
        },
      },
      { headerName: '스킬셋 ID', field: 'skillsetId', width: 130, cellStyle: { textAlign: 'right' } as CellStyle },
      { headerName: '스킬셋명', field: 'skillsetName', minWidth: 200, flex: 1.5, tooltipField: 'skillsetName' },
      {
        headerName: '미디어 타입',
        field: 'mediaType',
        minWidth: 140,
        valueFormatter: (p) => getMediaTypeName(p.value),
      },
      {
        headerName: '정렬순서',
        field: 'sortSeq',
        width: 90,
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '상담사 수',
        field: 'agentCount',
        width: 100,
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '0' : Number(p.value).toLocaleString()),
      },
      {
        headerName: '활성',
        field: 'activateYn',
        width: 72,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<SkillsetResponse>) => <YnPill value={p.data?.activateYn ?? null} />,
      },
      { headerName: '설명', field: 'skillsetDesc', minWidth: 200, flex: 1, tooltipField: 'skillsetDesc', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '스케줄',
        width: 70,
        maxWidth: 80,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'right',
        hide: !onManageSchedule,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<SkillsetResponse>) => {
          const { data } = params;
          if (!data) return null;
          return (
            <button
              type="button"
              title="스케줄 관리"
              className="text-gray-400 hover:text-[#405189]"
              onClick={(e) => {
                e.stopPropagation();
                onManageSchedule?.(data);
              }}
            >
              <CalendarClock className="size-4" />
            </button>
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
        cellRenderer: (params: ICellRendererParams<SkillsetResponse>) => {
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
    [onDelete, onManageSchedule, onBulkDelete, selectedCount, getDragSkillsetIds, showTenantColumn],
  );

  return (
    <AgGridReact<SkillsetResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false },
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
