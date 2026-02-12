import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ClientStatus = 'Y' | 'N';

const CLIENT_STATUS_META: Record<ClientStatus, { label: string; className: string }> = {
  Y: { label: '활성', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  N: { label: '비활성', className: 'text-[#F06548] bg-[#F065481A]' },
};

interface ClientStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export default function ClientStatusBadge({ isActive, className }: ClientStatusBadgeProps) {
  const status = isActive ? 'Y' : 'N';
  const meta = CLIENT_STATUS_META[status];
  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta?.className || CLIENT_STATUS_META.Y.className, className)}>
      {meta?.label || '-'}
    </Badge>
  );
}
