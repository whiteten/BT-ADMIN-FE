import { Clock, Play, Server, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BatchStatus } from '../types/sd.types';
import { formatDate, formatNumber } from '../utils';

interface StatusSummaryBarProps {
  status: BatchStatus | undefined;
}

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function SummaryCard({ icon: Icon, label, value }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 배치 상태 요약 바
 * - 서버 시간, 다음 실행, 기동 시간, 총 실행 횟수 표시
 */
export default function StatusSummaryBar({ status }: StatusSummaryBarProps) {
  if (!status) return null;

  const summaryItems: SummaryCardProps[] = [
    {
      icon: Server,
      label: '서버 시간',
      value: formatDate(status.serverTime, 'DATETIME'),
    },
    {
      icon: Timer,
      label: '다음 실행',
      value: formatDate(status.nextExecutionTime, 'TIME'),
    },
    {
      icon: Clock,
      label: '기동 시간',
      value: formatDate(status.startupTime, 'HOUR'),
    },
    {
      icon: Play,
      label: '총 실행 횟수',
      value: formatNumber(status.totalExecutionCount),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {summaryItems.map((item) => (
        <SummaryCard key={item.label} {...item} />
      ))}
    </div>
  );
}
