import type { TrainDiffStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TRAIN_DIFF_STATUS_META: Record<TrainDiffStatus, { label: string; className: string }> = {
  ADDED: { label: '추가', className: 'text-emerald-600 bg-emerald-50' },
  MODIFIED: { label: '수정', className: 'text-amber-600 bg-amber-50' },
  DELETED: { label: '삭제', className: 'text-red-500 bg-red-50' },
};

/** 그리드 filterValueGetter용 라벨 조회 */
export function trainDiffStatusLabel(status: TrainDiffStatus | null | undefined): string {
  return status ? (TRAIN_DIFF_STATUS_META[status]?.label ?? String(status)) : '';
}

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
