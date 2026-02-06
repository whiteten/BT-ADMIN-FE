import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGetCheckpoints,
  useGetExceptions,
  useGetProviders,
} from '../../../features/dashboard/hooks/useSdQueries';
import type { ExceptionRecord } from '../../../features/dashboard/types/sd.types';
import {
  ProviderSelector,
  DateRangeSelector,
  CheckpointTable,
  ExceptionTable,
  ExceptionDetailDialog,
} from '../../../features/dashboard/components';
import { getToday, getWeekAgo } from '../../../features/dashboard/utils';

/**
 * 이력 조회 페이지
 * - 체크포인트 이력 및 에러 이력 조회
 */
export default function History() {
  // Provider 선택
  const [selectedProvider, setSelectedProvider] = useState('');

  // 체크포인트 날짜 범위
  const [cpFrom, setCpFrom] = useState(getWeekAgo());
  const [cpTo, setCpTo] = useState(getToday());
  const [cpSearchParams, setCpSearchParams] = useState({ from: cpFrom, to: cpTo });

  // 에러 날짜 범위
  const [errFrom, setErrFrom] = useState(getWeekAgo());
  const [errTo, setErrTo] = useState(getToday());
  const [errSearchParams, setErrSearchParams] = useState({ from: errFrom, to: errTo });

  // 에러 상세 다이얼로그
  const [selectedError, setSelectedError] = useState<ExceptionRecord | null>(null);

  // Provider 목록 조회
  const { data: providers, isLoading: isProvidersLoading } = useGetProviders({});
  const activeProvider = selectedProvider || providers?.[0] || '';

  // 체크포인트 조회
  const { data: checkpoints, isLoading: isCpLoading } = useGetCheckpoints({
    params: {
      providerId: activeProvider,
      from: cpSearchParams.from,
      to: cpSearchParams.to,
    },
  });

  // 에러 조회
  const { data: exceptions, isLoading: isErrLoading } = useGetExceptions({
    params: {
      providerId: activeProvider,
      from: errSearchParams.from,
      to: errSearchParams.to,
    },
  });

  if (isProvidersLoading) return <FallbackSpinner />;

  const handleCpSearch = () => setCpSearchParams({ from: cpFrom, to: cpTo });
  const handleErrSearch = () => setErrSearchParams({ from: errFrom, to: errTo });

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        breadcrumb={[
          { title: 'SD' },
          { title: '모니터링', path: '/sd/monitoring' },
          { title: '이력 조회' },
        ]}
      />

      {/* Provider 선택 */}
      <ProviderSelector
        providers={providers}
        selectedProvider={activeProvider}
        onProviderChange={setSelectedProvider}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 체크포인트 이력 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">체크포인트 이력</CardTitle>
            <DateRangeSelector
              fromDate={cpFrom}
              toDate={cpTo}
              onFromDateChange={setCpFrom}
              onToDateChange={setCpTo}
              onSearch={handleCpSearch}
              isLoading={isCpLoading}
            />
          </CardHeader>
          <CardContent>
            <CheckpointTable checkpoints={checkpoints} isLoading={isCpLoading} />
          </CardContent>
        </Card>

        {/* 에러 이력 */}
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
              onSearch={handleErrSearch}
              isLoading={isErrLoading}
            />
          </CardHeader>
          <CardContent>
            <ExceptionTable
              exceptions={exceptions}
              isLoading={isErrLoading}
              onRowClick={setSelectedError}
            />
          </CardContent>
        </Card>
      </div>

      {/* 에러 상세 다이얼로그 */}
      <ExceptionDetailDialog
        exception={selectedError}
        onClose={() => setSelectedError(null)}
      />
    </div>
  );
}
