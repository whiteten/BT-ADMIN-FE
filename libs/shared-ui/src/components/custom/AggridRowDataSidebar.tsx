import { useEffect, useState } from 'react';
import type { CustomToolPanelProps } from 'ag-grid-react';
import _ from 'lodash';
import { OctagonAlert } from 'lucide-react';

function AggridRowDataSidebar<TData = Record<string, unknown>>(props: CustomToolPanelProps<TData>) {
  const { api } = props;
  const [selectedRowData, setSelectedRowData] = useState<TData | null>(null);

  useEffect(() => {
    if (!api || api.isDestroyed?.()) return;
    const handleSelectionChanged = () => {
      // 그리드 teardown 중에도 selectionChanged가 발화될 수 있어 파괴된 api 호출을 막는다 (AG Grid error #26)
      if (api.isDestroyed?.()) return;
      const selectedRows = api.getSelectedRows();
      const isRowSelected = selectedRows && selectedRows.length > 0;
      setSelectedRowData(isRowSelected ? selectedRows[0] : null);
      // if (isRowSelected) {
      //   api.openToolPanel('rowData');
      // } else {
      //   api.closeToolPanel();
      // }
    };
    const handlePaginationChanged = () => {
      if (api.isDestroyed?.()) return;
      api.deselectAll();
    };
    api.addEventListener('selectionChanged', handleSelectionChanged);
    api.addEventListener('paginationChanged', handlePaginationChanged);
    return () => {
      if (api && !api.isDestroyed?.()) {
        api.removeEventListener('selectionChanged', handleSelectionChanged);
        api.removeEventListener('paginationChanged', handlePaginationChanged);
      }
    };
  }, [api]);

  const renderColumnData = () => {
    if (!selectedRowData || !api) return null;

    const columnDefs = api.getColumnDefs();
    if (!columnDefs) return null;

    return columnDefs.map((colDef) => {
      if (!('field' in colDef) || !colDef.field) return null;
      const field = colDef.field;
      const value = _.get(selectedRowData, field, '');
      const displayName = colDef.headerName ?? field;
      return (
        <div key={field} className="pb-3">
          <p className="font-bold pb-1 break-all">{displayName}</p>
          <p className="text-sm text-gray-500 break-all">{value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
        </div>
      );
    });
  };

  const renderEmptyState = () => (
    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
      <OctagonAlert className="size-15 text-gray-500" />
      <p className="text-base text-gray-500">데이터를 선택해 주세요.</p>
    </div>
  );

  return <div className="w-full h-full overflow-y-auto p-3 select-text">{selectedRowData ? renderColumnData() : renderEmptyState()}</div>;
}

export default AggridRowDataSidebar;
