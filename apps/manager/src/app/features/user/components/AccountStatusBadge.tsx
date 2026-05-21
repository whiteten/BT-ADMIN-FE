import type { AccountStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: '활성', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  DORMANT: { label: '휴면', className: 'text-[#F7B84B] bg-[#F7B84B1A]' },
  DISABLED: { label: '비활성', className: 'text-[#F06548] bg-[#F065481A]' },
};

interface AccountStatusBadgeProps {
  status: AccountStatus;
  className?: string;
}

export default function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
  const meta = ACCOUNT_STATUS_META[status];
  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta?.className || ACCOUNT_STATUS_META.ACTIVE.className, className)}>
      {meta?.label || '-'}
    </Badge>
  );
}
