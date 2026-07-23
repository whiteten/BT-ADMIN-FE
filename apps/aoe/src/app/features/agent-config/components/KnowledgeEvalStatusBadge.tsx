import type { KnowledgeEvalStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVAL_STATUS_META: Record<KnowledgeEvalStatus, { label: string; className: string }> = {
  INACTIVE: { label: '미진행', className: 'text-gray-500 bg-gray-100' },
  ACTIVE: { label: '진행', className: 'text-emerald-600 bg-emerald-50' },
  PENDING: { label: '준비예정', className: 'text-amber-600 bg-amber-50' },
};

/** 그리드 filterValueGetter용 라벨 조회 */
export function knowledgeEvalStatusLabel(status: KnowledgeEvalStatus | null | undefined): string {
  return status ? (EVAL_STATUS_META[status]?.label ?? String(status)) : '';
}

interface KnowledgeEvalStatusBadgeProps {
  status: KnowledgeEvalStatus;
}

export default function KnowledgeEvalStatusBadge({ status }: KnowledgeEvalStatusBadgeProps) {
  const meta = EVAL_STATUS_META[status];
  if (!meta) return '-';
  return (
    <Badge variant="secondary" className={cn('text-[13px] font-medium !h-6', meta.className)}>
      {meta.label}
    </Badge>
  );
}
