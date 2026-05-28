import { useEffect, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, DatePicker, Select, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Pause, Play } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetCallStatusList } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { CallStatusItem } from '../../features/monitoring/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const SUMMARY_CHIP_COLORS = [
  { bg: 'bg-blue-50', label: 'text-blue-500', count: 'text-blue-700' },
  { bg: 'bg-emerald-50', label: 'text-emerald-500', count: 'text-emerald-700' },
  { bg: 'bg-amber-50', label: 'text-amber-500', count: 'text-amber-700' },
  { bg: 'bg-violet-50', label: 'text-violet-500', count: 'text-violet-700' },
  { bg: 'bg-rose-50', label: 'text-rose-500', count: 'text-rose-700' },
] as const;

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(3);

  const { data, isLoading } = useGetCallStatusList({
    params: { callDate: callDate.format('YYYYMMDD') },
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
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
          <span className="text-sm font-medium text-[#495057] shrink-0 pl-2">모니터링</span>
          <Select
            value={refreshSeconds}
            onChange={setRefreshSeconds}
            options={[
              { label: '3초', value: 3 },
              { label: '5초', value: 5 },
              { label: '10초', value: 10 },
              { label: '30초', value: 30 },
            ]}
            style={{ width: 72 }}
          />
          <Tooltip title={autoRefresh ? '모니터링 중지' : '모니터링 시작'}>
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${autoRefresh ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white' : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'}`}
            >
              {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </Tooltip>
        </header>

        {/* 요약 */}
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[#212529]">수집 녹취 현황</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoading &&
              summary.map((s, idx) => {
                const isTotal = s.workKindName === '전체콜';
                const color = SUMMARY_CHIP_COLORS[idx % SUMMARY_CHIP_COLORS.length];
                if (isTotal) {
                  return (
                    <>
                      <div key={s.workKindName} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-1.5">
                        <span className="text-xs text-gray-500">{s.workKindName}</span>
                        <span className="text-base font-bold text-gray-800">{s.cnt.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">건</span>
                      </div>
                      <div className="h-5 w-px bg-gray-200" />
                    </>
                  );
                }
                return (
                  <div key={s.workKindName} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${color.bg}`}>
                    <span className={`text-xs ${color.label}`}>{s.workKindName}</span>
                    <span className={`text-sm font-bold ${color.count}`}>{s.cnt.toLocaleString()}</span>
                    <span className={`text-xs ${color.label}`}>건</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 그리드 */}
        <div className="w-full h-full">
          <AgGridReact<CallStatusItem> {...gridOptions} rowData={items} columnDefs={columnDefs} pagination={false} statusBar={undefined} />
        </div>
      </div>
    </div>
  );
}
