import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { EXECUTION_TARGET_STATUS_LABELS } from '../constants/executionManagementConstants';
import { EXECUTION_DETAIL_SEARCH_CONDITION, type ExecutionDetailSearchCondition, type ExecutionTargetItem } from '../types';

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

export function getDetailSearchFieldText(item: ExecutionTargetItem, condition: ExecutionDetailSearchCondition): string {
  switch (condition) {
    case EXECUTION_DETAIL_SEARCH_CONDITION.CUSTOMER_NAME:
      return item.customerName;
    case EXECUTION_DETAIL_SEARCH_CONDITION.CUSTOMER_NUMBER:
      return item.customerNumber;
    case EXECUTION_DETAIL_SEARCH_CONDITION.PHONE_NUMBER:
      return item.phoneNumber;
    case EXECUTION_DETAIL_SEARCH_CONDITION.CALL_ID:
      return item.callId ?? '';
    default:
      return '';
  }
}

type CreateExecutionTargetColumnDefsOptions = {
  onDetailClick: (targetId: string) => void;
};

export function createExecutionTargetColumnDefs({ onDetailClick }: CreateExecutionTargetColumnDefsOptions): ColDef<ExecutionTargetItem>[] {
  return [
    {
      headerName: '',
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: ({ data }: ICellRendererParams<ExecutionTargetItem>) => {
        if (!data) return null;
        return (
          <button
            type="button"
            className="mx-auto flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-[#405189]"
            onClick={(event) => {
              event.stopPropagation();
              onDetailClick(data.targetId);
            }}
            aria-label="실행대상 상세보기"
          >
            <Search className="size-3.5" />
          </button>
        );
      },
    },
    {
      headerName: '',
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      flex: 0,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      sortable: false,
      filter: false,
    },
    { headerName: '고객명', field: 'customerName', flex: 1, minWidth: 100 },
    { headerName: '전화번호', field: 'phoneNumber', flex: 1.1, minWidth: 120 },
    { headerName: '고객번호', field: 'customerNumber', flex: 1.1, minWidth: 120 },
    {
      headerName: '처리상태',
      field: 'processStatus',
      flex: 1.1,
      minWidth: 120,
      valueFormatter: ({ value }) => EXECUTION_TARGET_STATUS_LABELS[value as keyof typeof EXECUTION_TARGET_STATUS_LABELS] ?? '-',
    },
    {
      headerName: '통화일시',
      field: 'callDateTime',
      flex: 1.2,
      minWidth: 160,
      valueFormatter: ({ value }) => formatDateTime(value as string),
    },
    { headerName: '콜ID', field: 'callId', flex: 1.4, minWidth: 180, valueFormatter: ({ value }) => (value as string) ?? '-' },
    {
      headerName: '작업일시',
      field: 'workDateTime',
      flex: 1.2,
      minWidth: 160,
      valueFormatter: ({ value }) => formatDateTime(value as string),
    },
  ];
}
