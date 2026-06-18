import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, DatePicker, Select, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Activity, CheckCircle2, Pause, PhoneIncoming, Play } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetDashboard } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { DashboardChannelItem, DashboardItem } from '../../features/monitoring/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/stt/monitoring' },
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

function SectionLabel({ children, desc }: { children: React.ReactNode; desc?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-[var(--color-bt-primary)]" />
      <h2 className="text-[15px] font-semibold text-slate-800">{children}</h2>
      {desc && <span className="hidden text-xs text-slate-400 sm:inline">{desc}</span>}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

function buildChartOption(items: DashboardItem[]): EChartsOption {
  const itemMap = new Map(items.map((i) => [i.callDate.replace('시', '').padStart(2, '0'), i]));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendTo: 'body',
      formatter: (params: unknown) => {
        const list = params as Array<{ seriesName: string; value: number; dataIndex: number; marker: string }>;
        if (!list?.length) return '';
        const hour = HOURS[list[0].dataIndex];
        const label = itemMap.get(hour)?.callDate ?? `${hour}시`;
        return [`<strong>${label}</strong>`, ...list.map((p) => `${p.marker}${p.seriesName}: <strong>${p.value}</strong>`)].join('<br/>');
      },
    },
    legend: { right: 0, top: 0, textStyle: { color: '#495057', fontSize: 12 } },
    grid: { left: 20, right: 20, bottom: 20, top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: HOURS.map((h) => `${h}시`),
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
        data: HOURS.map((h) => itemMap.get(h)?.real ?? 0),
        itemStyle: { color: CHART_COLORS.real, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
      },
      {
        name: '배치 인입',
        type: 'bar',
        data: HOURS.map((h) => itemMap.get(h)?.batch ?? 0),
        itemStyle: { color: CHART_COLORS.batch, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
      },
      {
        name: '총 변환 수',
        type: 'line',
        data: HOURS.map((h) => itemMap.get(h)?.completeCnt ?? 0),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: CHART_COLORS.completeCnt, width: 2 },
        itemStyle: { color: '#fff', borderColor: CHART_COLORS.completeCnt, borderWidth: 2 },
      },
    ],
  };
}

function getPerColor(per: number): { bar: string; text: string } {
  if (per >= 80) return { bar: 'bg-blue-800', text: 'text-blue-800' };
  if (per >= 50) return { bar: 'bg-blue-500', text: 'text-blue-500' };
  return { bar: 'bg-blue-300', text: 'text-blue-300' };
}

function ChannelCard({ item, onClick }: { item: DashboardChannelItem; onClick: (ip: string) => void }) {
  const { bar, text } = getPerColor(item.per);
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(item.systemIp)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#212529] truncate">{item.systemName}</p>
          {item.systemAlias && item.systemAlias !== item.systemName && <p className="text-xs text-gray-400 truncate">{item.systemAlias}</p>}
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{item.systemIp}</p>
        </div>
        <span className={`text-xl font-bold leading-none shrink-0 ${text}`}>{item.per}%</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-2 rounded-full transition-all ${bar}`} style={{ width: `${Math.min(item.per, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            진행 <strong className="text-gray-600">{item.runCnt}</strong>
          </span>
          <span>
            전체 <strong className="text-gray-600">{item.totCnt}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SttDashboard() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

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

  const incoming = summary.find((s) => s.kind === '콜인입');
  const converted = summary.find((s) => s.kind === 'STT변환');
  const totalIncoming = incoming?.cnt ?? 0;
  const totalConverted = converted?.cnt ?? 0;
  const conversionRate = totalIncoming > 0 ? ((totalConverted / totalIncoming) * 100).toFixed(1) : '0.0';

  const navigate = useNavigate();

  const handleChannelCardClick = (ip: string) => {
    navigate(`/stt/monitoring/channel/list?ipv4=${ip}`);
  };

  return (
    <div className="flex w-full flex-col gap-6 bg-gradient-to-b from-slate-50 to-slate-100/40 p-5">
      {/* 히어로 헤더 */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-white bt-shadow px-5 py-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
            <span className="text-[var(--color-bt-primary)]">STT</span> 대시보드
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">일별 STT 인입·변환 현황과 채널 모니터링 현황을 한 화면에서 확인</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <DatePicker value={callDate} onChange={(d) => d && setCallDate(d)} allowClear={false} format="YYYY-MM-DD" className="h-9" style={{ width: 160 }} />
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
            className="h-9"
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

      {/* 요약 KPI */}
      <section>
        <SectionLabel desc="조회일 기준으로 집계됩니다">요약 KPI</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          {/* 총 인입 건수 */}
          <div className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full opacity-80 bg-[#085fb5]" />
            <div className="flex items-start justify-between gap-2 pl-1.5">
              <p className="text-[12.5px] font-medium leading-tight text-slate-500">총 인입 건수</p>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: '#085fb514', color: '#085fb5' }}>
                <PhoneIncoming className="size-[15px]" strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-2 pl-1.5 text-[26px] font-bold leading-none tracking-tight text-[#085fb5] tabular-nums">
              {totalIncoming}
              <span className="ml-1 text-sm font-normal text-slate-400">건</span>
            </p>
            <div className="mt-2 pl-1.5 flex gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS.real }} />
                실시간 <strong className="font-semibold text-slate-600">{incoming?.rcnt ?? 0}건</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS.batch }} />
                배치 <strong className="font-semibold text-slate-600">{incoming?.bcnt ?? 0}건</strong>
              </span>
            </div>
            <p className="mt-1.5 pl-1.5 text-[11px] font-medium text-slate-400">
              최종 인입시간 <strong className="text-slate-600">{incoming?.finalTime ?? '-'}</strong>
            </p>
          </div>

          {/* 변환완료 건수 */}
          <div className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full opacity-80 bg-[#10b981]" />
            <div className="flex items-start justify-between gap-2 pl-1.5">
              <p className="text-[12.5px] font-medium leading-tight text-slate-500">변환완료 건수</p>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: '#10b98114', color: '#10b981' }}>
                <CheckCircle2 className="size-[15px]" strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-2 pl-1.5 text-[26px] font-bold leading-none tracking-tight text-[#10b981] tabular-nums">
              {totalConverted}
              <span className="ml-1 text-sm font-normal text-slate-400">건</span>
            </p>
            <div className="mt-2 pl-1.5 flex gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS.real }} />
                실시간 <strong className="font-semibold text-slate-600">{converted?.rcnt ?? 0}건</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS.batch }} />
                배치 <strong className="font-semibold text-slate-600">{converted?.bcnt ?? 0}건</strong>
              </span>
            </div>
            <p className="mt-1.5 pl-1.5 text-[11px] font-medium text-slate-400">
              최종 변환시간 <strong className="text-slate-600">{converted?.finalTime ?? '-'}</strong>
            </p>
          </div>

          {/* 당일 변환률 */}
          <div className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full opacity-80 bg-[#f59e0b]" />
            <div className="flex items-start justify-between gap-2 pl-1.5">
              <p className="text-[12.5px] font-medium leading-tight text-slate-500">당일 변환률</p>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: '#f59e0b14', color: '#f59e0b' }}>
                <Activity className="size-[15px]" strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-2 pl-1.5 text-[26px] font-bold leading-none tracking-tight text-[#f59e0b] tabular-nums">
              {conversionRate}
              <span className="ml-0.5 text-sm font-normal text-slate-400">%</span>
            </p>
            <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-1.5 rounded-full bg-[#f59e0b] transition-all" style={{ width: `${Math.min(Number(conversionRate), 100)}%` }} />
            </div>
            <p className="mt-2 pl-1.5 text-[11px] font-medium text-slate-400">
              {totalConverted}건 / {totalIncoming}건
            </p>
          </div>
        </div>
      </section>

      {/* 콜 인입/변환현황 차트 */}
      <section>
        <SectionLabel desc="날짜별 실시간·배치 인입 및 총 변환 수 추이">콜 인입/변환현황</SectionLabel>
        <div className="rounded-lg bg-white bt-shadow p-5">
          <ReactECharts option={buildChartOption(items)} notMerge style={{ height: 280, width: '100%' }} />
        </div>
      </section>

      {/* STT 채널 모니터링 */}
      <section>
        <SectionLabel desc="시스템별 채널 진행률">STT 채널 모니터링</SectionLabel>
        {channels.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">채널 정보가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {channels.map((item) => (
              <ChannelCard key={item.systemId} item={item} onClick={handleChannelCardClick} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
