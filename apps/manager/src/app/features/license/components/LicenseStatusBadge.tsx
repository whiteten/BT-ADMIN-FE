import type { LicenseStatus } from '../types';
import { cn } from '@/lib/utils';

const STATUS_META: Record<LicenseStatus, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
  ACTIVE: { label: '활성', bgClass: 'bg-green-100', textClass: 'text-green-700', dotClass: 'bg-green-500' },
  EXPIRING: { label: '만료임박', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', dotClass: 'bg-yellow-500' },
  EXPIRED: { label: '만료', bgClass: 'bg-red-100', textClass: 'text-red-700', dotClass: 'bg-red-500' },
  INACTIVE: { label: '비활성', bgClass: 'bg-slate-100', textClass: 'text-slate-500', dotClass: 'bg-slate-400' },
};

interface LicenseStatusBadgeProps {
  status: string;
  className?: string;
}

export default function LicenseStatusBadge({ status, className }: LicenseStatusBadgeProps) {
  const meta = STATUS_META[status as LicenseStatus] ?? STATUS_META.INACTIVE;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', meta.bgClass, meta.textClass, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </span>
  );
}

/**
 * FUNCTION 타입 항목의 활성/비활성 뱃지
 */
interface FunctionBadgeProps {
  isEnabled: boolean;
  className?: string;
}

export function FunctionBadge({ isEnabled, className }: FunctionBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        isEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', isEnabled ? 'bg-green-500' : 'bg-slate-400')} />
      {isEnabled ? '활성' : '비활성'}
    </span>
  );
}
