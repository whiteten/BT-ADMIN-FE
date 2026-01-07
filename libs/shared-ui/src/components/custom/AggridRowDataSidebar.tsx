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
          <p className="text-sm text-gray-500 break-all">{value}</p>
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
