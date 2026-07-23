import type { EvaluationResultStatus } from '../types/evaluation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVALUATION_RESULT_STATUS_META: Record<EvaluationResultStatus, { label: string; className: string }> = {
  대기중: { label: '대기중', className: 'text-gray-500 bg-gray-100' },
  진행중: { label: '진행중', className: 'text-blue-600 bg-blue-50' },
  완료: { label: '완료', className: 'text-emerald-600 bg-emerald-50' },
};

/** 그리드 filterValueGetter 등에서 상태 라벨을 재사용하기 위한 헬퍼 */
export const evaluationResultStatusLabel = (status: EvaluationResultStatus) => EVALUATION_RESULT_STATUS_META[status]?.label ?? '-';

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
