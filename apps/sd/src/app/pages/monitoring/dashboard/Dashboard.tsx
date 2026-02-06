import { useState } from 'react';
import PageHeader from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGetHourlyTrend,
  useGetProviders,
  useGetRecentCounts,
  useGetStatus,
} from '../../../features/dashboard/hooks/useSdQueries';
import {
  ProviderSelector,
  StatusSummaryBar,
  CdrStatusTable,
  StatStatusTable,
  DateNavigator,
  StatLineChart,
  TenMinTable,
  HourlyTable,
} from '../../../features/dashboard/components';
import { REFRESH_INTERVALS } from '../../../features/dashboard/constants';
import {
  extractUniqueStatTypes,
  getToday,
  transformToChartData,
  transformToTenMinRows,
} from '../../../features/dashboard/utils';

type AggregationTab = 'ten-min' | 'hourly';

/**
 * 대시보드 페이지
 * - Provider별 배치 집계 현황 모니터링
 * - CDR/통계 상태, 10분/시간대별 집계 추이 표시
 */
export default function Dashboard() {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [aggregationTab, setAggregationTab] = useState<AggregationTab>('ten-min');

  // Provider 목록 조회
  const { data: providers, isLoading: isProvidersLoading } = useGetProviders({});

  // 현재 선택된 Provider (선택 안됐으면 첫 번째 자동 선택)
  const activeProvider = selectedProvider || providers?.[0] || '';

  // Provider 상태 조회 (자동 리프레시)
  const { data: status } = useGetStatus({
    params: { providerId: activeProvider },
    queryOptions: { refetchInterval: REFRESH_INTERVALS.STATUS },
  });

  // 10분 단위 집계 데이터
  const { data: recentCounts } = useGetRecentCounts({
    params: { providerId: activeProvider, date: selectedDate },
  });

  // 시간대별 집계 데이터
  const { data: hourlyTrend } = useGetHourlyTrend({
    params: { providerId: activeProvider, date: selectedDate },
  });

  if (isProvidersLoading) return <FallbackSpinner />;

  // 데이터 변환
  const tenMinStatTypes = extractUniqueStatTypes(recentCounts);
  const tenMinRows = transformToTenMinRows(recentCounts);
  const hourlyStatTypes = extractUniqueStatTypes(hourlyTrend);
  const chartData = transformToChartData(hourlyTrend);

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        breadcrumb={[
          { title: 'SD' },
          { title: '모니터링', path: '/sd/monitoring' },
          { title: '대시보드' },
        ]}
      />

      {/* Provider 선택 */}
      <ProviderSelector
        providers={providers}
        selectedProvider={activeProvider}
        onProviderChange={setSelectedProvider}
        cronExpression={status?.config?.cron}
      />

      {/* 상태 요약 */}
      <StatusSummaryBar status={status} />

      {/* CDR / 통계 상태 테이블 */}
      {status && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CdrStatusTable cdrStatuses={status.cdrStatuses} />
          <StatStatusTable statStatuses={status.statStatuses} />
        </div>
      )}

      {/* 집계 현황 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">집계 현황</CardTitle>
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={aggregationTab}
            onValueChange={(v) => setAggregationTab(v as AggregationTab)}
          >
            <TabsList>
              <TabsTrigger value="ten-min">10분 단위</TabsTrigger>
              <TabsTrigger value="hourly">시간대별</TabsTrigger>
            </TabsList>

            <TabsContent value="ten-min" className="mt-3">
              <TenMinTable rows={tenMinRows} statTypes={tenMinStatTypes} />
            </TabsContent>

            <TabsContent value="hourly" className="mt-3 space-y-4">
              <StatLineChart data={chartData} statTypes={hourlyStatTypes} />
              <HourlyTable data={chartData} statTypes={hourlyStatTypes} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
