import { useEffect, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, DatePicker, Select, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Pause, Play } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetDashboard } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { DashboardChannelItem, DashboardItem } from '../../features/monitoring/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 모니터링', path: '/stt/monitoring' },
  { title: 'STT 대시보드', path: '/stt/monitoring/dashboard/list' },
];

const CHART_COLORS = {
  real: '#7DB8DA',
  batch: '#F5C542',
  completeCnt: '#7BC9A5',
} as const;

const SUMMARY_META: Record<string, { title: string; timeLabel: string }> = {
  콜인입: { title: '총 인입 건수', timeLabel: '최종 인입시간' },
  STT변환: { title: '변환완료 건수', timeLabel: '최종 변환시간' },
};

function buildChartOption(items: DashboardItem[]): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendTo: 'body',
      formatter: (params: unknown) => {
        const list = params as Array<{ seriesName: string; value: number; dataIndex: number; marker: string }>;
        if (!list?.length) return '';
        const idx = list[0].dataIndex;
        return [`<strong>${items[idx]?.callDate ?? ''}</strong>`, ...list.map((p) => `${p.marker}${p.seriesName}: <strong>${p.value}</strong>`)].join('<br/>');
      },
    },
    legend: {
      right: 0,
      top: 0,
      textStyle: { color: '#495057', fontSize: 12 },
    },
    grid: { left: 20, right: 20, bottom: 20, top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.callDate),
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
      splitLine: { lineStyle: { type: 'dashed', color: '#E9EBEC' } },
    },
    series: [
      {
        name: '실시간 인입',
        type: 'bar',
        data: items.map((i) => i.real),
        itemStyle: { color: CHART_COLORS.real, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: '#555', fontSize: 11 },
        barMaxWidth: 60,
      },
      {
        name: '배치 인입',
        type: 'bar',
        data: items.map((i) => i.batch),
        itemStyle: { color: CHART_COLORS.batch, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: '#555', fontSize: 11 },
        barMaxWidth: 60,
      },
      {
        name: '총 변환 수',
        type: 'line',
        data: items.map((i) => i.completeCnt),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: CHART_COLORS.completeCnt, width: 2 },
        itemStyle: { color: '#fff', borderColor: CHART_COLORS.completeCnt, borderWidth: 2 },
        label: { show: true, position: 'top', color: '#555', fontSize: 11 },
      },
    ],
  };
}

const columnDefs: ColDef<DashboardChannelItem>[] = [
  { field: 'systemName', headerName: '시스템명', flex: 1 },
  { field: 'systemIp', headerName: '시스템 IP', flex: 1, headerClass: 'ag-center-aligned-header' },
  { field: 'totCnt', headerName: '전체 채널', width: 120, headerClass: 'ag-center-aligned-header' },
  { field: 'runCnt', headerName: '진행 채널', width: 120, headerClass: 'ag-center-aligned-header' },
  {
    field: 'per',
    headerName: '진행률',
    width: 160,
    headerClass: 'ag-center-aligned-header',
    cellRenderer: 'percentBarRenderer',
    cellStyle: { display: 'flex', alignItems: 'center', padding: '0 8px' },
  },
];

export default function SttDashboard() {
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

  const { data } = useGetDashboard({
    params: { callDate: callDate.format('YYYYMMDD') },
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  const items = data?.items ?? [];
  const summary = data?.summary ?? [];
  const channels = data?.channels ?? [];

  // 변환률 계산
  const totalIncoming = summary.find((s) => s.kind === '콜인입')?.cnt ?? 0;
  const totalConverted = summary.find((s) => s.kind === 'STT변환')?.cnt ?? 0;
  const conversionRate = totalIncoming > 0 ? ((totalConverted / totalIncoming) * 100).toFixed(1) : '0.0';

  const handleDateChange = (value: Dayjs | null) => {
    if (value) setCallDate(value);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 콜 인입/변환현황 */}
      <div className="flex flex-col gap-3 bg-white bt-shadow p-5">
        {/* 툴바 */}
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#212529]">콜 인입/변환현황</h2>
          <div className="flex items-center gap-2 shrink-0">
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
                className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${autoRefresh ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white' : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'}`}
              >
                {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </Tooltip>
          </div>
        </header>

        {/* 요약 + 차트 */}
        <div className="flex gap-4 items-stretch">
          {/* 좌: 요약 카드 세로 배치 */}
          <div className="flex flex-col gap-3 shrink-0 w-[220px]">
            {summary.map((s) => {
              const meta = SUMMARY_META[s.kind] ?? { title: s.kind, timeLabel: '최종 시간' };
              return (
                <div key={s.kind} className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-gray-500">{meta.title}</p>
                    <p className="text-2xl font-bold leading-none text-gray-800">
                      {s.cnt}
                      <span className="ml-1 text-sm font-normal text-gray-500">건</span>
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.real }} />
                      실시간 <strong className="font-semibold">{s.rcnt}건</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.batch }} />
                      배치 <strong className="font-semibold">{s.bcnt}건</strong>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {meta.timeLabel} <strong className="font-semibold text-gray-600">{s.finalTime}</strong>
                  </p>
                </div>
              );
            })}

            {/* 변환률 카드 */}
            <div className="flex items-baseline justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">변환률</p>
              <p className="text-2xl font-bold leading-none text-[#7BC9A5]">{conversionRate}%</p>
            </div>
          </div>

          {/* 우: 차트 */}
          <div className="flex-1 min-w-0">
            <ReactECharts option={buildChartOption(items)} notMerge style={{ height: 300, width: '100%' }} />
          </div>
        </div>
      </div>

      {/* STT 채널모니터링 */}
      <div className="flex flex-col gap-4 bg-white bt-shadow p-5 flex-1 min-h-0">
        <header className="flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-base font-semibold text-[#212529]">STT 채널모니터링</h2>
        </header>
        <div className="flex-1 min-h-0">
          <AgGridReact<DashboardChannelItem> {...gridOptions} rowData={channels} columnDefs={columnDefs} pagination={false} statusBar={undefined} />
        </div>
      </div>
    </div>
  );
}
