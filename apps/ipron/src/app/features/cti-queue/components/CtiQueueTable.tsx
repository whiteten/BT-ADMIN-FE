/**
 * CTI 큐 목록 ag-Grid 테이블 (단일 그리드, 멤버 없음) — AcdGdnTable 패턴.
 *
 * 컬럼: ☐ | CTIQ ID | [테넌트] | 그룹DN번호 | 그룹DN이름 | DR노드 | 글로벌여부 |
 *       기본 라우팅그룹 | 활성화 | 블럭 | 최대대기 사용 | 최대대기(초) |
 *       호회수T/O(초) | SL(초) | 큐포기(초) | 정렬순서 | [휴지통]
 *
 * 행 더블클릭 → 5탭 Drawer (수정). 페이지네이션 없음.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { GripVertical } from 'lucide-react';
import type { CtiQueueOptionItem, CtiQueueResponse } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/** D&D 채널 — CtiQueueGroupTree.onDrop 과 협의된 MIME. 페이로드: JSON ctiqId 배열. */
export const CTI_QUEUE_DRAG_MIME = 'application/x-bt-ctiq-ids';

interface CtiQueueTableProps {
  rowData: CtiQueueResponse[];
  isLoading?: boolean;
  /** 기본 라우팅그룹 ID → 이름 매핑 (firstGroupId 표시용). */
  groupOptions?: CtiQueueOptionItem[];
  /** "업무그룹 보기" 토글 — ON 시 업무그룹명(treeName) 컬럼을 좌측에 추가 노출 + 드래그 핸들 표시. */
  groupView?: boolean;
  onRowDoubleClicked: (row: CtiQueueResponse) => void;
  onDelete: (row: CtiQueueResponse) => void;
  onSelectionChanged?: (selected: CtiQueueResponse[]) => void;
  onBulkDelete?: () => void;
  selectedCount?: number;
  /** drag 시점에 dataTransfer 에 실어 보낼 ctiqId 배열 결정. 선택된 게 있으면 그것, 없으면 단건. */
  getDragCtiqIds?: (dragRow: CtiQueueResponse) => number[];
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

function StatePill({ value, onText, offText, tone }: { value: number | null; onText: string; offText: string; tone: 'green' | 'amber' | 'blue' }) {
  const on = value === 1;
  const onCls =
    tone === 'green'
      ? 'text-green-700 bg-green-50 border-green-200'
      : tone === 'amber'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-blue-700 bg-blue-50 border-blue-200';
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[42px] h-[20px] px-1.5 leading-none rounded text-[11px] font-medium border ${on ? onCls : 'text-gray-500 bg-gray-50 border-gray-200'}`}
    >
      {on ? onText : offText}
    </span>
  );
}

export default function CtiQueueTable({
  rowData,
  isLoading,
  groupOptions = [],
  groupView = false,
  onRowDoubleClicked,
  onDelete,
  onSelectionChanged,
  onBulkDelete,
  selectedCount = 0,
  getDragCtiqIds,
}: CtiQueueTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const groupNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of groupOptions) m.set(g.id, g.name);
    return m;
  }, [groupOptions]);

  const num = (v: number | null | undefined) => (v == null ? '-' : Number(v).toLocaleString());

  const columnDefs: ColDef<CtiQueueResponse>[] = useMemo(
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
        headerName: '',
        colId: 'dragHandle',
        width: 28,
        maxWidth: 28,
        pinned: 'left',
        sortable: false,
        filter: false,
        hide: !groupView,
        suppressHeaderMenuButton: true,
        cellStyle: { padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<CtiQueueResponse>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div
              draggable
              onDragStart={(e) => {
                const ids = getDragCtiqIds?.(data) ?? [data.ctiqId];
                e.dataTransfer.setData(CTI_QUEUE_DRAG_MIME, JSON.stringify(ids));
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
      {
        headerName: 'CTIQ ID',
        field: 'ctiqId',
        minWidth: 90,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <span className="font-mono text-[12px] text-gray-700">{p.value ?? ''}</span>,
      },
      {
        headerName: '업무그룹명',
        field: 'treeName',
        colId: 'workGroupName',
        minWidth: 120,
        hide: !groupView,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => {
          const v = p.data?.treeName;
          if (!v) return <span className="text-red-500 text-xs">미배정</span>;
          return <span className="text-gray-800">{v}</span>;
        },
      },
      {
        headerName: '그룹DN번호',
        field: 'gdnNo',
        flex: 1,
        minWidth: 110,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <span className="font-mono font-semibold text-gray-800">{p.value ?? '-'}</span>,
      },
      { headerName: '그룹DN이름', field: 'gdnName', flex: 2, minWidth: 140, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: 'DR노드',
        field: 'backUpNodeId',
        minWidth: 80,
        maxWidth: 100,
        cellStyle: { textAlign: 'center', color: '#9ca3af', fontSize: '12px' } as CellStyle,
        valueFormatter: (p) => (p.value == null || p.value === 0 ? '—' : String(p.value)),
      },
      {
        headerName: '글로벌여부',
        field: 'globalDnYn',
        minWidth: 110,
        maxWidth: 120,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) =>
          p.value === 1 ? (
            <span className="inline-flex items-center justify-center h-[20px] px-1.5 leading-none rounded text-[11px] font-medium border text-green-700 bg-green-50 border-green-200">
              O (Global)
            </span>
          ) : (
            <span className="inline-flex items-center justify-center h-[20px] px-1.5 leading-none rounded text-[11px] font-medium border text-gray-400 bg-gray-50 border-gray-200">
              X
            </span>
          ),
      },
      {
        headerName: '기본 라우팅그룹',
        field: 'firstGroupId',
        flex: 1,
        minWidth: 130,
        valueFormatter: (p) => (p.value == null || p.value === 0 ? '없음' : (groupNameById.get(Number(p.value)) ?? String(p.value))),
      },
      {
        headerName: '활성화',
        field: 'activateYn',
        minWidth: 80,
        maxWidth: 90,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <StatePill value={p.data?.activateYn ?? null} onText="ON" offText="OFF" tone="green" />,
      },
      {
        headerName: '블럭',
        field: 'blockYn',
        minWidth: 80,
        maxWidth: 90,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <StatePill value={p.data?.blockYn ?? null} onText="설정" offText="해제" tone="amber" />,
      },
      {
        headerName: '최대대기 사용',
        field: 'maxWaittimeYn',
        minWidth: 116,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <StatePill value={p.data?.maxWaittimeYn ?? null} onText="Y" offText="N" tone="blue" />,
      },
      { headerName: '최대대기(초)', field: 'maxWaittime', minWidth: 110, cellStyle: { textAlign: 'right' } as CellStyle, valueFormatter: (p) => num(p.value) },
      { headerName: '호회수T/O(초)', field: 'collectTimeout', minWidth: 124, cellStyle: { textAlign: 'right' } as CellStyle, valueFormatter: (p) => num(p.value) },
      { headerName: 'SL(초)', field: 'serviceLevelTime', minWidth: 84, cellStyle: { textAlign: 'right' } as CellStyle, valueFormatter: (p) => num(p.value) },
      { headerName: '큐포기(초)', field: 'abandonAcktime', minWidth: 100, cellStyle: { textAlign: 'right' } as CellStyle, valueFormatter: (p) => num(p.value) },
      { headerName: '정렬순서', field: 'sortSeq', minWidth: 90, cellStyle: { textAlign: 'right' } as CellStyle, valueFormatter: (p) => num(p.value) },
      {
        headerName: '',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'right',
        headerComponent: () => <BulkDeleteHeader onBulkDelete={onBulkDelete} selectedCount={selectedCount} />,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<CtiQueueResponse>) => {
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
    [groupView, groupNameById, onDelete, onBulkDelete, selectedCount, getDragCtiqIds],
  );

  return (
    <AgGridReact<CtiQueueResponse>
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
