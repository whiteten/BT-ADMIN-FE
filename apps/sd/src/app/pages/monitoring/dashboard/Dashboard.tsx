import { useState } from 'react';
import PageHeader from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetHourlyTrend, useGetProviders, useGetRecentCounts, useGetStatus } from '../../../features/dashboard/hooks/useSdQueries';
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
import { REFRESH_INTERVALS } from '../../../features/dashboard/types/sd.types';
import { extractUniqueStatTypes, getToday, transformToChartData, transformToTenMinRows } from '../../../features/dashboard/hooks/useSdHelpers';

type AggregationTab = 'ten-min' | 'hourly';

export default function Dashboard() {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [aggregationTab, setAggregationTab] = useState<AggregationTab>('ten-min');

  const { data: providers, isLoading: isProvidersLoading } = useGetProviders({});
  const activeProvider = selectedProvider || providers?.[0] || '';

  const { data: status } = useGetStatus({
    params: { providerId: activeProvider },
    queryOptions: { refetchInterval: REFRESH_INTERVALS.STATUS },
  });

  const { data: recentCounts } = useGetRecentCounts({
    params: { providerId: activeProvider, date: selectedDate },
  });

  const { data: hourlyTrend } = useGetHourlyTrend({
    params: { providerId: activeProvider, date: selectedDate },
  });

  if (isProvidersLoading) return <FallbackSpinner />;

  const tenMinStatTypes = extractUniqueStatTypes(recentCounts);
  const tenMinRows = transformToTenMinRows(recentCounts);
  const hourlyStatTypes = extractUniqueStatTypes(hourlyTrend);
  const chartData = transformToChartData(hourlyTrend);

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader breadcrumb={[{ title: 'SD' }, { title: '모니터링', path: '/sd/monitoring' }, { title: '대시보드' }]} />

      <ProviderSelector
        providers={providers}
        selectedProvider={activeProvider}
        onProviderChange={setSelectedProvider}
        cronExpression={status?.config?.cron}
      />

      <StatusSummaryBar status={status} />

      {status && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CdrStatusTable cdrStatuses={status.cdrStatuses} />
          <StatStatusTable statStatuses={status.statStatuses} />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">집계 현황</CardTitle>
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={aggregationTab} onValueChange={(v) => setAggregationTab(v as AggregationTab)}>
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
