import type { EvaluationResultStatus } from '../types/evaluation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVALUATION_RESULT_STATUS_META: Record<EvaluationResultStatus, { label: string; className: string }> = {
  0: { label: '대기중', className: 'text-[#495057] bg-[#E9EBEC]' },
  1: { label: '진행중', className: 'text-[#1F79D4] bg-[#1F79D41A]' },
  2: { label: '완료', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
};

interface EvaluationResultStatusBadgeProps {
  status: EvaluationResultStatus;
}

export default function EvaluationResultStatusBadge({ status }: EvaluationResultStatusBadgeProps) {
  const meta = EVALUATION_RESULT_STATUS_META[status];
  if (!meta) return '-';

  return (
    <Badge variant="secondary" className={cn('text-[13px] font-medium !h-6', meta.className)}>
      {meta.label}
    </Badge>
  );
}
