/**
 * 교환기 멘트 목록 ag-Grid 테이블 (단일 그리드) — CtiQueueTable 패턴.
 *
 * 컬럼: ☐ | 멘트ID | [테넌트] | 멘트명 | 파일명 | 설명 | 업로드일자 | 재생 | [휴지통]
 *  - IPRON 표준: quartz, header menu button(필터버튼)/floating filter 미사용.
 *  - 재생: PCM→WAV 변환(BE preview) 후 <audio> 미리듣기.
 *
 * 행 더블클릭 → 수정 Drawer.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Pause, Play, Trash2 } from 'lucide-react';
import type { MentResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/** YYYYMMDD → YYYY-MM-DD */
function fmtDate(v: string | null | undefined): string {
  if (!v || v.length < 8) return v ?? '';
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

interface MentTableProps {
  rowData: MentResponse[];
  isLoading?: boolean;
  /** 현재 재생 중인 멘트 ID (null=정지). */
  playingMentId?: number | null;
  onRowDoubleClicked: (row: MentResponse) => void;
  onTogglePlay: (row: MentResponse) => void;
  onSelectionChanged?: (selected: MentResponse[]) => void;
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
      <Trash2 className="size-5 text-red-500" />
    </button>
  );
}

export default function MentTable({
  rowData,
  isLoading,
  playingMentId = null,
  onRowDoubleClicked,
  onTogglePlay,
  onSelectionChanged,
  onBulkDelete,
  selectedCount = 0,
}: MentTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: false, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<MentResponse>[] = useMemo(
    () => [
      {
        headerName: '멘트ID',
        field: 'ieMentId',
        minWidth: 90,
        maxWidth: 110,
        cellRenderer: (p: ICellRendererParams<MentResponse>) => <span className="font-mono text-[12px] text-gray-500">{p.value ?? ''}</span>,
      },
      {
        headerName: '테넌트',
        field: 'tenantName',
        minWidth: 120,
        maxWidth: 160,
        cellRenderer: (p: ICellRendererParams<MentResponse>) =>
          p.data?.tenantId === 0 ? (
            <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold border border-blue-200 text-blue-700 bg-blue-50">공통</span>
          ) : (
            <span className="text-gray-700">{p.value ?? '-'}</span>
          ),
      },
      {
        headerName: '멘트명',
        field: 'mentName',
        flex: 1,
        minWidth: 140,
        tooltipField: 'mentName',
        cellRenderer: (p: ICellRendererParams<MentResponse>) => <span className="font-semibold text-gray-700">{p.value ?? ''}</span>,
      },
      {
        headerName: '파일명',
        field: 'fileName',
        flex: 1,
        minWidth: 140,
        tooltipField: 'fileName',
        cellStyle: { fontFamily: 'monospace', color: '#475569' } as CellStyle,
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '설명',
        field: 'mentDesc',
        flex: 1.2,
        minWidth: 150,
        tooltipField: 'mentDesc',
        cellStyle: { color: '#6b7280' } as CellStyle,
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '업로드일자',
        field: 'createDate',
        minWidth: 110,
        maxWidth: 130,
        cellStyle: { textAlign: 'center', color: '#6b7280' } as CellStyle,
        valueFormatter: (p) => fmtDate(p.value),
      },
      {
        headerName: '재생',
        colId: 'play',
        width: 64,
        maxWidth: 70,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<MentResponse>) => {
          const { data } = params;
          if (!data) return null;
          const playing = playingMentId === data.ieMentId;
          return (
            <button
              type="button"
              title="미리듣기 (PCM→WAV)"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay(data);
              }}
              className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-full border transition-colors ${
                playing ? 'bg-[#405189] border-[#405189] text-white' : 'border-gray-300 text-[#405189] hover:border-[#405189] hover:bg-blue-50'
              }`}
            >
              {playing ? <Pause className="size-3" /> : <Play className="size-3 fill-current" />}
            </button>
          );
        },
      },
    ],
    [playingMentId, onTogglePlay, onBulkDelete, selectedCount],
  );

  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  return (
    <AgGridReact<MentResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      rowSelection={rowSelection}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
