import type { TrainStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TRAIN_STATUS_META: Record<TrainStatus, { label: string; className: string }> = {
  0: { label: '미학습', className: 'text-[#495057] bg-[#E9EBEC]' },
  1: { label: '학습중', className: 'text-[#1F79D4] bg-[#1F79D41A]' },
  2: { label: '학습완료', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
};

interface TrainStatusBadgeProps {
  status: TrainStatus;
}

export default function TrainStatusBadge({ status }: TrainStatusBadgeProps) {
  const meta = TRAIN_STATUS_META[status];
  if (!meta) return '-';

  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta.className)}>
      {meta.label}
    </Badge>
  );
}
