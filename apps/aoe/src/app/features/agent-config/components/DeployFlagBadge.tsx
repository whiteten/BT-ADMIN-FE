import type { AoeDeployFlag } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DEPLOY_FLAG_META: Record<AoeDeployFlag, { label: string; className: string }> = {
  0: { label: '미배포', className: 'text-gray-500 bg-gray-100' },
  1: { label: '배포', className: 'text-emerald-600 bg-emerald-50' },
};

/** 그리드 filterValueGetter용 라벨 조회 */
export function deployFlagLabel(flag: AoeDeployFlag | null | undefined): string {
  return flag != null ? (DEPLOY_FLAG_META[flag]?.label ?? String(flag)) : '';
}

interface DeployFlagBadgeProps {
  flag: AoeDeployFlag;
}

export default function DeployFlagBadge({ flag }: DeployFlagBadgeProps) {
  const meta = DEPLOY_FLAG_META[flag];
  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta?.className || DEPLOY_FLAG_META[0].className)}>
      {meta?.label || '-'}
    </Badge>
  );
}
