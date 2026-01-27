import type { TrainDiffStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TRAIN_DIFF_STATUS_META: Record<TrainDiffStatus, { label: string; className: string }> = {
  ADDED: { label: '추가', className: 'text-[#389e0d] bg-[#f6ffed]' },
  MODIFIED: { label: '수정', className: 'text-[#d46b08] bg-[#fff7e6]' },
  DELETED: { label: '삭제', className: 'text-[#c94732] bg-[#fff5f0]' },
};

interface TrainDiffStatusBadgeProps {
  status: TrainDiffStatus;
}

export default function TrainDiffStatusBadge({ status }: TrainDiffStatusBadgeProps) {
  const meta = TRAIN_DIFF_STATUS_META[status];
  if (!meta) return '';
  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta.className)}>
      {meta.label}
    </Badge>
  );
}
