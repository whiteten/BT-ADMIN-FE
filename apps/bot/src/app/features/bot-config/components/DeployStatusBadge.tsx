import type { DeployStatus } from '../types';
import { IconAlertTriangle } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DEPLOY_STATUS_META: Record<DeployStatus, { label: string; className: string }> = {
  0: { label: '미배포', className: 'text-[#495057] bg-[#E9EBEC]' },
  1: { label: '배포중', className: 'text-[#1F79D4] bg-[#1F79D41A]' },
  2: { label: '배포완료', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  3: { label: '배포실패', className: 'text-[#F06548] bg-[#F065481A]' },
};

interface DeployStatusBadgeProps {
  status: DeployStatus;
  showAlert?: boolean;
}

export default function DeployStatusBadge({ status, showAlert = false }: DeployStatusBadgeProps) {
  const meta = DEPLOY_STATUS_META[status];
  return (
    <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta?.className || DEPLOY_STATUS_META[0].className)}>
      {meta?.label || '-'}
      {showAlert && <IconAlertTriangle className="!size-4.5 text-[#F7B84B] mt-[1px]" />}
    </Badge>
  );
}
