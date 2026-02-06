import { CircleDot, Pause, Play } from 'lucide-react';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SchedulerStatus } from '../types/sd.types';

interface SchedulerCardProps {
  providerId: string;
  status: SchedulerStatus;
  pauseReason: string;
  onPauseReasonChange: (reason: string) => void;
  onPause: () => void;
  onResume: () => void;
  isPausing?: boolean;
  isResuming?: boolean;
}

/**
 * 스케줄러 상태 카드
 */
export default function SchedulerCard({
  providerId,
  status,
  pauseReason,
  onPauseReasonChange,
  onPause,
  onResume,
  isPausing = false,
  isResuming = false,
}: SchedulerCardProps) {
  const getStatusIcon = () => {
    if (status.paused) return 'text-destructive';
    if (status.running) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBadge = () => {
    if (status.paused) return { variant: 'destructive' as const, label: '정지됨' };
    if (status.running) return { variant: 'default' as const, label: '실행 중' };
    return { variant: 'secondary' as const, label: '대기' };
  };

  const badgeConfig = getStatusBadge();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDot className={`h-4 w-4 ${getStatusIcon()}`} />
            {providerId}
          </CardTitle>
          <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Cron: </span>
            <span className="font-mono text-xs">{status.cron ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">지연: </span>
            <span>{status.delaySeconds ?? 0}초</span>
          </div>
          <div>
            <span className="text-muted-foreground">최종 실행: </span>
            <span className="text-xs">
              {status.lastExecutionTime ? dayjs(status.lastExecutionTime).format('HH:mm:ss') : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">다음 실행: </span>
            <span className="text-xs">
              {status.nextScheduledTime ? dayjs(status.nextScheduledTime).format('HH:mm:ss') : '-'}
            </span>
          </div>
        </div>

        {/* Pause Info */}
        {status.paused && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">사유: </span>
              {status.pauseReason ?? '-'}
            </p>
            <p>
              <span className="text-muted-foreground">시간: </span>
              {status.pausedAt ? dayjs(status.pausedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </p>
            {status.pausedBy && (
              <p>
                <span className="text-muted-foreground">사용자: </span>
                {status.pausedBy}
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!status.paused ? (
            <>
              <Input
                placeholder="중지 사유 입력"
                value={pauseReason}
                onChange={(e) => onPauseReasonChange(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                variant="destructive"
                size="sm"
                className="h-8 shrink-0"
                onClick={onPause}
                disabled={isPausing}
              >
                <Pause className="mr-1 h-3 w-3" /> 정지
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-8"
              onClick={onResume}
              disabled={isResuming}
            >
              <Play className="mr-1 h-3 w-3" /> 재개
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
