import type { TrainStatus } from '../types';
import { IconAlertTriangle } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TRAIN_STATUS_META: Record<TrainStatus, { label: string; className: string }> = {
  0: { label: '미학습', className: 'text-[#495057] bg-[#E9EBEC]' },
  1: { label: '학습중', className: 'text-[#1F79D4] bg-[#1F79D41A]' },
  2: { label: '학습완료', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  3: { label: '학습실패', className: 'text-[#F06548] bg-[#F065481A]' },
};

interface TrainStatusBadgeProps {
  status: TrainStatus;
  showAlert?: boolean;
}

export default function TrainStatusBadge({ status, showAlert = false }: TrainStatusBadgeProps) {
  const meta = TRAIN_STATUS_META[status];
  return (
    <div className={cn('flex items-center', showAlert ? 'gap-1' : '')}>
      <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta?.className || TRAIN_STATUS_META[0].className)}>
        {meta?.label || '-'}
      </Badge>
      {showAlert && <IconAlertTriangle className="size-5 text-[#F7B84B] mt-[1px]" />}
    </div>
  );
}
