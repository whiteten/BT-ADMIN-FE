import { useEffect, useMemo, useRef } from 'react';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { SCHEDULE_SERVER_ACTIVE_LABELS } from '../constants/scheduleServerConstants';
import type { ScheduleServerItem } from '../types/scheduleServer';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

type ScheduleServerGridProps = {
  rowData: ScheduleServerItem[];
  selectedServerId?: string | null;
  onRowClick?: (item: ScheduleServerItem) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
};

export default function ScheduleServerGrid({ rowData, selectedServerId, onRowClick, onSelectionChange }: ScheduleServerGridProps) {
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<ScheduleServerItem>>(null);

  const columnDefs = useMemo<ColDef<ScheduleServerItem>[]>(
    () => [
      { headerName: '구분', field: 'serverCategory', flex: 0.6, minWidth: 70 },
      {
        headerName: '액티브여부',
        field: 'active',
        flex: 0.8,
        minWidth: 100,
        valueFormatter: ({ value }) => SCHEDULE_SERVER_ACTIVE_LABELS[value as keyof typeof SCHEDULE_SERVER_ACTIVE_LABELS] ?? '-',
      },
      { headerName: '호스트명', field: 'hostName', flex: 1.2, minWidth: 120 },
      { headerName: '서버IP', field: 'serverIp', flex: 1.2, minWidth: 140 },
      { headerName: '서버포트', field: 'serverPort', flex: 0.8, minWidth: 100 },
      { headerName: '프로토콜', field: 'protocol', flex: 0.8, minWidth: 90 },
    ],
    [],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.redrawRows();
  }, [selectedServerId]);

  const handleRowClicked = (event: RowClickedEvent<ScheduleServerItem>) => {
    if (!event.data) return;
    onRowClick?.(event.data);
  };

  const handleSelectionChanged = () => {
    const api = gridRef.current?.api;
    if (!api || !onSelectionChange) return;
    const selectedIds = api.getSelectedRows().map((row) => row.serverId);
    onSelectionChange(selectedIds);
  };

  return (
    <div className="w-full h-[280px]">
      <AgGridReact<ScheduleServerItem>
        ref={gridRef}
        rowModelType="clientSide"
        rowData={rowData}
        getRowId={(params) => params.data.serverId}
        columnDefs={columnDefs}
        gridOptions={{
          ...gridOptions,
          sideBar: false,
          rowNumbers: false,
          rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false },
          getRowClass: (params) => (params.data?.serverId === selectedServerId ? 'ag-row-selected' : undefined),
        }}
        onRowClicked={handleRowClicked}
        onSelectionChanged={handleSelectionChanged}
      />
    </div>
  );
}
