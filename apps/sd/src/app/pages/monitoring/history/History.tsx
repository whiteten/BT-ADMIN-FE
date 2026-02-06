import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetCheckpoints, useGetExceptions, useGetProviders } from '../../../features/dashboard/hooks/useSdQueries';
import type { ExceptionRecord } from '../../../features/dashboard/types/sd.types';
import {
  ProviderSelector,
  DateRangeSelector,
  CheckpointTable,
  ExceptionTable,
  ExceptionDetailDialog,
} from '../../../features/dashboard/components';
import { getToday, getWeekAgo } from '../../../features/dashboard/hooks/useSdHelpers';

export default function History() {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [cpFrom, setCpFrom] = useState(getWeekAgo());
  const [cpTo, setCpTo] = useState(getToday());
  const [cpSearchParams, setCpSearchParams] = useState({ from: cpFrom, to: cpTo });
  const [errFrom, setErrFrom] = useState(getWeekAgo());
  const [errTo, setErrTo] = useState(getToday());
  const [errSearchParams, setErrSearchParams] = useState({ from: errFrom, to: errTo });
  const [selectedError, setSelectedError] = useState<ExceptionRecord | null>(null);

  const { data: providers, isLoading: isProvidersLoading } = useGetProviders({});
  const activeProvider = selectedProvider || providers?.[0] || '';

  const { data: checkpoints, isLoading: isCpLoading } = useGetCheckpoints({
    params: { providerId: activeProvider, from: cpSearchParams.from, to: cpSearchParams.to },
  });

  const { data: exceptions, isLoading: isErrLoading } = useGetExceptions({
    params: { providerId: activeProvider, from: errSearchParams.from, to: errSearchParams.to },
  });

  if (isProvidersLoading) return <FallbackSpinner />;

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader breadcrumb={[{ title: 'SD' }, { title: '모니터링', path: '/sd/monitoring' }, { title: '이력 조회' }]} />

      <ProviderSelector providers={providers} selectedProvider={activeProvider} onProviderChange={setSelectedProvider} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">체크포인트 이력</CardTitle>
            <DateRangeSelector
              fromDate={cpFrom}
              toDate={cpTo}
              onFromDateChange={setCpFrom}
              onToDateChange={setCpTo}
              onSearch={() => setCpSearchParams({ from: cpFrom, to: cpTo })}
              isLoading={isCpLoading}
            />
          </CardHeader>
          <CardContent>
            <CheckpointTable checkpoints={checkpoints} isLoading={isCpLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">에러 이력</CardTitle>
            </div>
            <DateRangeSelector
              fromDate={errFrom}
              toDate={errTo}
              onFromDateChange={setErrFrom}
              onToDateChange={setErrTo}
              onSearch={() => setErrSearchParams({ from: errFrom, to: errTo })}
              isLoading={isErrLoading}
            />
          </CardHeader>
          <CardContent>
            <ExceptionTable exceptions={exceptions} isLoading={isErrLoading} onRowClick={setSelectedError} />
          </CardContent>
        </Card>
      </div>

      <ExceptionDetailDialog exception={selectedError} onClose={() => setSelectedError(null)} />
    </div>
  );
}
