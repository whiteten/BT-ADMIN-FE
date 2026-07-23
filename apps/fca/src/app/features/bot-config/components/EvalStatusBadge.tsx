import type { EvalStatus } from '../types/evaluation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVAL_STATUS_META: Record<EvalStatus, { label: string; className: string }> = {
  0: { label: '미진행', className: 'text-gray-500 bg-gray-100' },
  1: { label: '성공', className: 'text-emerald-600 bg-emerald-50' },
  2: { label: '실패', className: 'text-red-500 bg-red-50' },
};

/** 그리드 filterValueGetter용 라벨 조회 */
export function evalStatusLabel(status: EvalStatus | null | undefined): string {
  return status != null ? (EVAL_STATUS_META[status]?.label ?? String(status)) : '';
}

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
