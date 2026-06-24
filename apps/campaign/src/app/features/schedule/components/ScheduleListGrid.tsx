import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { SCHEDULE_STATUS_LABELS, SCHEDULE_TYPE_LABELS } from '../constants/scheduleConstants';
import type { ScheduleListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

type ScheduleListGridProps = {
  rowData: ScheduleListItem[];
  showSelection?: boolean;
  onDetailClick?: (item: ScheduleListItem) => void;
};

function createColumnDefs({ showSelection, onDetailClick }: { showSelection?: boolean; onDetailClick?: (item: ScheduleListItem) => void }): ColDef<ScheduleListItem>[] {
  const columns: ColDef<ScheduleListItem>[] = [];

  if (onDetailClick) {
    columns.push({
      headerName: '',
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: ({ data }: ICellRendererParams<ScheduleListItem>) => {
        if (!data) return null;
        return (
          <button
            type="button"
            className="mx-auto flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-[#405189]"
            onClick={(event) => {
              event.stopPropagation();
              onDetailClick(data);
            }}
            aria-label="스케줄 상세보기"
          >
            <Search className="size-3.5" />
          </button>
        );
      },
    });
  }

  if (showSelection) {
    columns.push({
      headerName: '',
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      flex: 0,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      sortable: false,
      filter: false,
    });
  }

  columns.push(
    { headerName: '스케줄명', field: 'scheduleName', flex: 1.5, minWidth: 160 },
    {
      headerName: '스케줄 구분',
      field: 'scheduleType',
      flex: 1,
      minWidth: 110,
      valueFormatter: ({ value }) => SCHEDULE_TYPE_LABELS[value as keyof typeof SCHEDULE_TYPE_LABELS] ?? '-',
    },
    {
      headerName: '시작시간',
      field: 'startTime',
      flex: 1.2,
      minWidth: 160,
      valueFormatter: ({ value }) => formatDateTime(value as string),
    },
    {
      headerName: '종료시간',
      field: 'endTime',
      flex: 1.2,
      minWidth: 160,
      valueFormatter: ({ value }) => formatDateTime(value as string),
    },
    {
      headerName: '상태',
      field: 'status',
      flex: 0.8,
      minWidth: 90,
      valueFormatter: ({ value }) => SCHEDULE_STATUS_LABELS[value as keyof typeof SCHEDULE_STATUS_LABELS] ?? '-',
    },
    { headerName: '상태메시지', field: 'statusMessage', flex: 1.5, minWidth: 140 },
    { headerName: '테넌트명', field: 'tenantName', flex: 1.2, minWidth: 120 },
    { headerName: '작업자', field: 'worker', flex: 0.8, minWidth: 90 },
    {
      headerName: '작업일시',
      field: 'workDateTime',
      flex: 1.2,
      minWidth: 160,
      valueFormatter: ({ value }) => formatDateTime(value as string),
    },
  );

  return columns;
}

export default function ScheduleListGrid({ rowData, showSelection, onDetailClick }: ScheduleListGridProps) {
  const { gridOptions } = useAggridOptions();
  const columnDefs = createColumnDefs({ showSelection, onDetailClick });

  return (
    <AgGridReact<ScheduleListItem>
      rowModelType="clientSide"
      rowData={rowData}
      getRowId={(params) => params.data.scheduleId}
      columnDefs={columnDefs}
      gridOptions={{
        ...gridOptions,
        rowSelection: showSelection ? 'multiple' : undefined,
      }}
    />
  );
}
