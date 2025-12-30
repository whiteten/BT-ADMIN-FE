import type { EvalStatus } from '../types/evaluation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVAL_STATUS_META: Record<EvalStatus, { label: string; className: string }> = {
  0: { label: '미진행', className: 'text-[#495057] bg-[#E9EBEC]' },
  1: { label: '성공', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  2: { label: '실패', className: 'text-[#F06548] bg-[#F065481A]' },
};

interface EvalStatusBadgeProps {
  status: EvalStatus;
}

export default function EvalStatusBadge({ status }: EvalStatusBadgeProps) {
  const meta = EVAL_STATUS_META[status];
  if (!meta) return '-';

  return (
    <Badge variant="secondary" className={cn('text-[13px] font-medium !h-6', meta.className)}>
      {meta.label}
    </Badge>
  );
}
