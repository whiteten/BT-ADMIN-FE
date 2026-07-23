/**
 * 스킬셋 마스터 ag-Grid — AdnTable 패턴.
 *
 * 컬럼: ⠿ | ☐ | 테넌트 | 업무그룹 | 스킬셋ID | 스킬셋명 | 미디어타입 | 정렬 | 상담사수 | 활성 | 설명 | [휴지통]
 * (드래그핸들 컬럼이 첫 번째 열 — 체크박스는 rowSelection prop으로 처리되므로 그 앞)
 */
import { useMemo, useRef } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { CalendarClock, GripVertical } from 'lucide-react';
import { type SkillsetResponse, getMediaTypeName } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
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
    <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${active ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
      {active ? '활성' : '비활성'}
    </Badge>
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
  const { gridOptions, defaultColDef: hookDefaultColDef } = useAggridOptions();
  // 훅의 defaultColDef(filter:true 포함)를 기반으로 추가 키만 덮는다.
  // 로컬에서 통째로 새 객체를 만들면 filter:true 가 유실되어 텍스트 컬럼 헤더 필터가 사라짐.
  const defaultColDef: ColDef = useMemo(() => ({ ...hookDefaultColDef, suppressHeaderMenuButton: true }), [hookDefaultColDef]);
  // gridOptions inline spread 를 useMemo 로 안정화 — 매 렌더마다 새 객체를 넘기면
  // ag-Grid 가 그리드를 재초기화해 onSelectionChanged 가 발화되고 setState 루프가 생길 수 있다.
  const stableGridOptions = useMemo(
    () => ({
      ...gridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
    }),
    [gridOptions],
  );

  // BulkDeleteHeader 에 최신 onBulkDelete/selectedCount 를 전달하되 columnDefs useMemo deps 에는
  // 포함시키지 않는다. selectedCount 가 바뀔 때마다 columnDefs 가 재생성되면 ag-Grid 가 컬럼을
  // 재초기화하면서 onSelectionChanged → setSelectedRows → selectedCount 변경 → 무한 루프가 발생한다.
  const bulkDeleteRef = useRef({ onBulkDelete, selectedCount });
  bulkDeleteRef.current = { onBulkDelete, selectedCount };

  const columnDefs: ColDef<SkillsetResponse>[] = useMemo(
    () => [
      {
        headerName: '',
        colId: 'dragHandle',
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
                e.stopPropagation();
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
          if (!v) return <span className="text-gray-400 text-xs">미배정</span>;
          return <span className="text-gray-800">{v}</span>;
        },
      },
      { headerName: '스킬셋 ID', field: 'skillsetId', width: 130, filter: 'agNumberColumnFilter', cellStyle: { textAlign: 'right' } as CellStyle },
      {
        headerName: '스킬셋명',
        field: 'skillsetName',
        minWidth: 200,
        flex: 1.5,
        tooltipField: 'skillsetName',
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '미디어 타입',
        field: 'mediaType',
        minWidth: 140,
        filterValueGetter: (params) => getMediaTypeName(params.data?.mediaType),
        valueFormatter: (p) => getMediaTypeName(p.value),
      },
      {
        headerName: '정렬순서',
        field: 'sortSeq',
        width: 90,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '상담사 수',
        field: 'agentCount',
        width: 100,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '0' : Number(p.value).toLocaleString()),
      },
      {
        headerName: '활성',
        field: 'activateYn',
        width: 72,
        filterValueGetter: (params) => (params.data?.activateYn === 1 ? '활성' : '비활성'),
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
        headerComponent: () => <BulkDeleteHeader onBulkDelete={bulkDeleteRef.current.onBulkDelete} selectedCount={bulkDeleteRef.current.selectedCount} />,
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
    // onBulkDelete/selectedCount 는 deps 에서 제거 — bulkDeleteRef.current 로 항상 최신을 읽음.
    // deps 에 포함 시 선택행 변경마다 columnDefs 재생성 → ag-Grid 컬럼 재초기화 → onSelectionChanged 발화 → 무한루프.

    [onDelete, onManageSchedule, getDragSkillsetIds, showTenantColumn],
  );

  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  return (
    <AgGridReact<SkillsetResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      rowSelection={rowSelection}
      gridOptions={stableGridOptions}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
