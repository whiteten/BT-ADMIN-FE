import type { AccountStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: '활성', className: 'text-emerald-600 bg-emerald-50' },
  DORMANT: { label: '휴면', className: 'text-amber-600 bg-amber-50' },
  DISABLED: { label: '비활성', className: 'text-gray-500 bg-gray-100' },
};

/** 그리드 filterValueGetter 등에서 셀 표시와 동일한 라벨을 쓰기 위한 조회 함수 */
export function accountStatusLabel(status: AccountStatus | null | undefined): string {
  return status ? (ACCOUNT_STATUS_META[status]?.label ?? String(status)) : '';
}

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
