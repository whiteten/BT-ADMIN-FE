/**
 * 스케줄 정의(메타) ag-Grid 테이블 — AdnTable 패턴.
 *
 * 컬럼: ☐ | 스케줄명 | 요일(7칩) | 시작시간 | 종료시간 | (스킬탭) 스킬명·미디어 | 배정 {주체} 수 | 작업일시
 * - 멀티셀렉트: useAggridOptions selectionColumnDef(좌측 고정 체크박스) + rowSelection multiRow
 * - 행 더블클릭 = 수정 (수정 버튼 없음, IPRON 표준)
 * - raw 코드 노출 금지: 미디어 라벨 매핑, 배정 0/null = '-'
 * - 페이징 금지 (IPRON 전역 규칙): pagination:false
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, RowSelectionOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { SCHEDULE_DAY_FIELDS, SUBJECT_LABELS, type ScheduleInfoResponse, type ScheduleKind, type ScheduleSubject, getMediaTypeName } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface ScheduleInfoTableProps {
  rowData: ScheduleInfoResponse[];
  kind: ScheduleKind;
  subject: ScheduleSubject;
  isLoading?: boolean;
  onRowDoubleClicked: (row: ScheduleInfoResponse) => void;
  onSelectionChanged?: (selected: ScheduleInfoResponse[]) => void;
}

/** "HHMM" → "HH:MM" */
function fmtTime(v?: string | null): string {
  if (!v) return '-';
  const p = v.padStart(4, '0');
  return `${p.slice(0, 2)}:${p.slice(2, 4)}`;
}

function DayChips({ row }: { row: ScheduleInfoResponse }) {
  return (
    <div className="flex flex-nowrap gap-0.5">
      {SCHEDULE_DAY_FIELDS.map((d) => (
        <span
          key={d.key}
          className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded text-[10px] ${row[d.key] === 1 ? 'bg-[#405189] text-white' : 'bg-gray-100 text-gray-400'}`}
        >
          {d.label}
        </span>
      ))}
    </div>
  );
}

export default function ScheduleInfoTable({ rowData, kind, subject, isLoading, onRowDoubleClicked, onSelectionChanged }: ScheduleInfoTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, editable: false, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  const isSkill = kind === 'skill';
  const subjectLabel = SUBJECT_LABELS[subject];

  const columnDefs: ColDef<ScheduleInfoResponse>[] = useMemo(() => {
    const cols: ColDef<ScheduleInfoResponse>[] = [
      {
        headerName: '스케줄명',
        field: 'scheduleName',
        minWidth: 160,
        flex: 1.4,
        tooltipField: 'scheduleName',
        cellRenderer: (params: ICellRendererParams<ScheduleInfoResponse>) => {
          if (!params.data) return null;
          return <span className="font-medium text-gray-800">{params.data.scheduleName}</span>;
        },
      },
      {
        headerName: '요일',
        colId: 'days',
        minWidth: 150,
        maxWidth: 180,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ScheduleInfoResponse>) => (params.data ? <DayChips row={params.data} /> : null),
      },
      {
        headerName: '시작 시간',
        field: 'startTime',
        minWidth: 100,
        maxWidth: 130,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => fmtTime(p.value),
      },
      {
        headerName: '종료 시간',
        field: 'finishTime',
        minWidth: 100,
        maxWidth: 130,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => fmtTime(p.value),
      },
    ];

    if (isSkill) {
      cols.push(
        { headerName: '스킬명', field: 'skillName', minWidth: 130, flex: 1, tooltipField: 'skillName', valueFormatter: (p) => p.value ?? '-' },
        {
          headerName: '미디어',
          field: 'mediaType',
          minWidth: 130,
          filterValueGetter: (params) => getMediaTypeName(params.data?.mediaType),
          cellRenderer: (params: ICellRendererParams<ScheduleInfoResponse>) => {
            const name = getMediaTypeName(params.data?.mediaType);
            if (name === '-') return <span className="text-gray-400">-</span>;
            return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-700">{name}</span>;
          },
        },
      );
    }

    cols.push(
      {
        headerName: `배정 ${subjectLabel} 수`,
        field: 'assignedCount',
        minWidth: 120,
        maxWidth: 150,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<ScheduleInfoResponse>) => {
          const v = params.data?.assignedCount ?? 0;
          if (v <= 0) return <span className="text-gray-400">-</span>;
          return <span className="font-medium text-gray-800">{v.toLocaleString()}</span>;
        },
      },
      { headerName: '작업 일시', field: 'workTime', minWidth: 150, flex: 1, valueFormatter: (p) => p.value ?? '-' },
    );

    return cols;
  }, [isSkill, subjectLabel]);

  return (
    <AgGridReact<ScheduleInfoResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
      }}
      rowSelection={rowSelection}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
