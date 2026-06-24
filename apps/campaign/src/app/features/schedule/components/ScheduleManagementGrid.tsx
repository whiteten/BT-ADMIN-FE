import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { SCHEDULE_USAGE_FLAG_LABELS } from '../constants/scheduleManagementConstants';
import type { ScheduleManagementItem } from '../types/scheduleManagement';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

type ScheduleManagementGridProps = {
  rowData: ScheduleManagementItem[];
  showSelection?: boolean;
  onDetailClick?: (item: ScheduleManagementItem) => void;
};

function createColumnDefs({ showSelection, onDetailClick }: { showSelection?: boolean; onDetailClick?: (item: ScheduleManagementItem) => void }): ColDef<ScheduleManagementItem>[] {
  const columns: ColDef<ScheduleManagementItem>[] = [];

  if (onDetailClick) {
    columns.push({
      headerName: '',
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: ({ data }: ICellRendererParams<ScheduleManagementItem>) => {
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
    { headerName: '스케줄명', field: 'scheduleName', flex: 1.4, minWidth: 160 },
    { headerName: '서비스명', field: 'serviceName', flex: 1.2, minWidth: 140 },
    { headerName: '메서드명', field: 'methodName', flex: 0.7, minWidth: 90 },
    { headerName: '파라미터', field: 'parameter', flex: 2.5, minWidth: 220, tooltipField: 'parameter' },
    { headerName: '실행주기', field: 'executionCycle', flex: 1, minWidth: 120 },
    {
      headerName: '사용여부',
      field: 'usageEnabled',
      flex: 0.7,
      minWidth: 90,
      valueFormatter: ({ value }) => SCHEDULE_USAGE_FLAG_LABELS[value as keyof typeof SCHEDULE_USAGE_FLAG_LABELS] ?? '-',
    },
    {
      headerName: '이력수집',
      field: 'historyCollection',
      flex: 0.7,
      minWidth: 90,
      valueFormatter: ({ value }) => SCHEDULE_USAGE_FLAG_LABELS[value as keyof typeof SCHEDULE_USAGE_FLAG_LABELS] ?? '-',
    },
    { headerName: '작업자', field: 'worker', flex: 0.7, minWidth: 90 },
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

export default function ScheduleManagementGrid({ rowData, showSelection, onDetailClick }: ScheduleManagementGridProps) {
  const { gridOptions } = useAggridOptions();
  const columnDefs = createColumnDefs({ showSelection, onDetailClick });

  return (
    <AgGridReact<ScheduleManagementItem>
      rowModelType="clientSide"
      rowData={rowData}
      getRowId={(params) => params.data.scheduleId}
      columnDefs={columnDefs}
      gridOptions={{
        ...gridOptions,
        sideBar: false,
        rowSelection: showSelection ? 'multiple' : undefined,
        tooltipShowDelay: 300,
      }}
    />
  );
}
