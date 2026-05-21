import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { PanelDetail } from '../../../report/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface PanelGridProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelGrid({ panel }: PanelGridProps) {
  const { gridOptions } = useAggridOptions();

  const valueFields = panel.fieldMap.filter((f) => f.slotType === 'VALUE' || f.slotType === 'Y_AXIS').map((f) => f.fieldName);

  const rowFields = panel.fieldMap.filter((f) => f.slotType === 'ROW' || f.slotType === 'X_AXIS').map((f) => f.fieldName);

  const allFields = [...rowFields, ...valueFields];

  const columnDefs: ColDef[] = allFields.map((field) => ({
    field,
    headerName: field,
    sortable: true,
    type: valueFields.includes(field) ? 'numericColumn' : undefined,
  }));

  return <AgGridReact {...gridOptions} rowData={[]} columnDefs={columnDefs} pagination={false} domLayout="autoHeight" />;
}
