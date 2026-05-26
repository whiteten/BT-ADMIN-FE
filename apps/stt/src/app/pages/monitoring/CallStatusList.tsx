import { useEffect, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Monitor } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetCallStatusList } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { CallStatusItem } from '../../features/monitoring/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 모니터링', path: '/stt/monitoring' },
  { title: 'STT 콜별 진행현황', path: '/stt/monitoring/call/list' },
];

const columnDefs: ColDef<CallStatusItem>[] = [
  { field: 'ucidGkey', headerName: '고유번호(UCID)', flex: 1, minWidth: 260 },
  { field: 'filename', headerName: '파일명', width: 110, headerClass: 'ag-center-aligned-header' },
  {
    field: 'callDate',
    headerName: '날짜',
    width: 110,
    headerClass: 'ag-center-aligned-header',
    valueFormatter: ({ value }) => (value?.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : (value ?? '')),
  },
  {
    field: 'callTime',
    headerName: '시간',
    width: 90,
    headerClass: 'ag-center-aligned-header',
    valueFormatter: ({ value }) => (value?.length === 6 ? `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}` : (value ?? '')),
  },
  { field: 'workKindName', headerName: '상태', width: 130, headerClass: 'ag-center-aligned-header' },
  { field: 'dnNo', headerName: '내선', width: 80, headerClass: 'ag-center-aligned-header' },
  { field: 'dbInsertTime', headerName: '입력시간', width: 175, headerClass: 'ag-center-aligned-header' },
  { field: 'saRuntime', headerName: '수행시간', width: 110, headerClass: 'ag-center-aligned-header' },
];

export default function CallStatusList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { gridOptions } = useAggridOptions();

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [callDate, setCallDate] = useState<Dayjs>(dayjs());

  const { data, isLoading } = useGetCallStatusList({
    params: { callDate: callDate.format('YYYYMMDD') },
  });

  const summary = data?.summary ?? [];
  const items = data?.items ?? [];

  const handleDateChange = (value: Dayjs | null) => {
    if (value) setCallDate(value);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-4 w-full h-full bg-white bt-shadow p-5">
        {/* 툴바 */}
        <header className="flex items-center justify-end gap-2">
          <span className="text-sm font-medium text-[#495057]">조회일</span>
          <DatePicker value={callDate} onChange={handleDateChange} allowClear={false} style={{ width: 160 }} format="YYYY-MM-DD" />
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded border border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5 transition-colors"
          >
            <Monitor className="size-4" />
          </button>
        </header>

        {/* 요약 */}
        <p className="text-base font-semibold text-[#212529]">수집 녹취 현황</p>
        <div className="flex items-center gap-6 text-sm text-[#495057]">
          {isLoading
            ? null
            : summary.map((s) => (
                <span key={s.workKindName}>
                  {s.workKindName} : <strong className="font-semibold">{s.cnt}</strong>
                </span>
              ))}
        </div>

        {/* 그리드 */}
        <div className="w-full h-full">
          <AgGridReact<CallStatusItem> {...gridOptions} rowData={items} columnDefs={columnDefs} pagination={false} statusBar={undefined} />
        </div>
      </div>
    </div>
  );
}
