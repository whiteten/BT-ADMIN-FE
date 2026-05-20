import type { KnowledgeEvalStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVAL_STATUS_META: Record<KnowledgeEvalStatus, { label: string; className: string }> = {
  INACTIVE: { label: '미진행', className: 'text-[#495057] bg-[#E9EBEC]' },
  ACTIVE: { label: '진행', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  PENDING: { label: '준비예정', className: 'text-[#F7B84B] bg-[#F7B84B1A]' },
};

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
