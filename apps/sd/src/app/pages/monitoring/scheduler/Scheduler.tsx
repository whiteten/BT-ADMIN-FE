import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared-util';
import PageHeader from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { sdQueryKeys, useGetAllSchedulerStatus, usePauseScheduler, useResumeScheduler } from '../../../features/dashboard/hooks/useSdQueries';
import { SchedulerCard } from '../../../features/dashboard/components';
import { REFRESH_INTERVALS } from '../../../features/dashboard/types/sd.types';

export default function Scheduler() {
  const queryClient = useQueryClient();
  const [pauseReasons, setPauseReasons] = useState<Record<string, string>>({});

  const { data: allStatus, isLoading } = useGetAllSchedulerStatus({
    queryOptions: { refetchInterval: REFRESH_INTERVALS.STATUS },
  });

  const pauseScheduler = usePauseScheduler({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: sdQueryKeys.getAllSchedulerStatus.queryKey });
        toast.success('스케줄러가 일시 정지되었습니다.');
      },
      onError: () => toast.error('스케줄러 일시 정지에 실패했습니다.'),
    },
  });

  const resumeScheduler = useResumeScheduler({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: sdQueryKeys.getAllSchedulerStatus.queryKey });
        toast.success('스케줄러가 재개되었습니다.');
      },
      onError: () => toast.error('스케줄러 재개에 실패했습니다.'),
    },
  });

  if (isLoading) return <FallbackSpinner />;

  const providers = allStatus ? Object.entries(allStatus) : [];

  const handlePause = (providerId: string) => {
    const reason = pauseReasons[providerId]?.trim();
    if (!reason) {
      toast.error('중지 사유를 입력해주세요.');
      return;
    }
    pauseScheduler.mutate({ providerId, reason });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader breadcrumb={[{ title: 'SD' }, { title: '모니터링', path: '/sd/monitoring' }, { title: '스케줄러 제어' }]} />

      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">등록된 Provider가 없습니다.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {providers.map(([providerId, status]) => (
            <SchedulerCard
              key={providerId}
              providerId={providerId}
              status={status}
              pauseReason={pauseReasons[providerId] ?? ''}
              onPauseReasonChange={(reason) => setPauseReasons((prev) => ({ ...prev, [providerId]: reason }))}
              onPause={() => handlePause(providerId)}
              onResume={() => resumeScheduler.mutate(providerId)}
              isPausing={pauseScheduler.isPending}
              isResuming={resumeScheduler.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
