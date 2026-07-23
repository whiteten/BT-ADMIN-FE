import type { TrainStatus } from '../types';
import { IconAlertTriangle } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TRAIN_STATUS_META: Record<TrainStatus, { label: string; className: string }> = {
  0: { label: '미학습', className: 'text-gray-500 bg-gray-100' },
  1: { label: '학습중', className: 'text-blue-600 bg-blue-50' },
  2: { label: '학습완료', className: 'text-emerald-600 bg-emerald-50' },
  3: { label: '학습실패', className: 'text-red-500 bg-red-50' },
};

/** 그리드 filterValueGetter용 라벨 조회 */
export function trainStatusLabel(status: TrainStatus | null | undefined): string {
  return status != null ? (TRAIN_STATUS_META[status]?.label ?? String(status)) : '';
}

interface TrainStatusBadgeProps {
  status: TrainStatus;
  showAlert?: boolean;
}

export default function TrainStatusBadge({ status, showAlert = false }: TrainStatusBadgeProps) {
  const meta = TRAIN_STATUS_META[status];
  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta?.className || TRAIN_STATUS_META[0].className)}>
      {meta?.label || '-'}
      {showAlert && <IconAlertTriangle className="!size-4.5 text-[#F7B84B] mt-[1px]" />}
    </Badge>
  );
}
