/**
 * 테넌트 전환 Dialog
 * - 사용자가 접근 가능한 테넌트 목록을 표시하고 선택
 * - shadcn Dialog + forwardRef 패턴
 * - 실제 전환 API는 추후 연결 (현재는 onSelect 콜백만 호출)
 */

import { forwardRef, useImperativeHandle, useState } from 'react';
import { Building2, Check } from 'lucide-react';
import type { TenantSummary } from '@/shared-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export interface TenantSwitchDialogRef {
  open: () => void;
  close: () => void;
}

export interface TenantSwitchDialogProps {
  /** 현재 테넌트 ID (강조 표시용) */
  currentTenantId: string;
  /** 접근 가능한 테넌트 목록 */
  availableTenants: TenantSummary[];
  /** 테넌트 선택 시 호출 (현재 테넌트 클릭은 무시) */
  onSelect: (tenant: TenantSummary) => void;
}

export const TenantSwitchDialog = forwardRef<TenantSwitchDialogRef, TenantSwitchDialogProps>(({ currentTenantId, availableTenants, onSelect }, ref) => {
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const currentIdNum = Number(currentTenantId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>테넌트 전환</DialogTitle>
          <DialogDescription>접근 가능한 테넌트 중에서 선택하세요.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2 max-h-[400px] overflow-y-auto">
          {availableTenants.map((t) => {
            const isCurrent = t.tenantId === currentIdNum;
            return (
              <button
                key={t.tenantId}
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  if (isCurrent) return;
                  onSelect(t);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors',
                  isCurrent ? 'border-blue-500 bg-blue-50 cursor-default' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className={cn('h-4 w-4 flex-shrink-0', isCurrent ? 'text-blue-600' : 'text-gray-400')} />
                  <div className="flex flex-col min-w-0">
                    <span className={cn('text-sm font-medium truncate', isCurrent ? 'text-blue-900' : 'text-gray-800')}>{t.tenantName || `테넌트 ${t.tenantId}`}</span>
                    <span className="text-xs text-gray-500">ID: {t.tenantId}</span>
                  </div>
                </div>
                {isCurrent && (
                  <span className="flex items-center gap-1 text-xs font-medium text-blue-700 flex-shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    현재
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
});

TenantSwitchDialog.displayName = 'TenantSwitchDialog';
