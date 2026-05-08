/**
 * 로그인 시 테넌트 선택 Dialog
 * - 다중 테넌트 사용자가 로그인할 테넌트를 선택
 * - 우측 상단 프로필의 TenantSwitchDialog 와 동일한 디자인 톤 유지
 * - 카드 클릭 즉시 onSelect 호출 (별도 확정 버튼 없음)
 */

import { forwardRef, useImperativeHandle, useState } from 'react';
import { Building2 } from 'lucide-react';
import type { AvailableTenantOption } from '../features/auth/types/auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export interface TenantSelectionDialogOpenParams {
  tenants: AvailableTenantOption[];
}

export interface TenantSelectionDialogRef {
  open: (params: TenantSelectionDialogOpenParams) => void;
  close: () => void;
}

export interface TenantSelectionDialogProps {
  /** 사용자가 테넌트를 선택했을 때 호출 (선택한 테넌트 정보 전달) */
  onSelect: (tenant: AvailableTenantOption) => void;
  /** 다이얼로그가 닫혔을 때 호출 (취소 또는 외부 닫힘) */
  onClose?: () => void;
  /** 로그인 재시도 진행 중 여부 (true 이면 카드 비활성화 + 닫기 차단) */
  loading?: boolean;
}

export const TenantSelectionDialog = forwardRef<TenantSelectionDialogRef, TenantSelectionDialogProps>(({ onSelect, onClose, loading = false }, ref) => {
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<AvailableTenantOption[]>([]);

  useImperativeHandle(ref, () => ({
    open: ({ tenants: list }) => {
      setTenants(list);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>테넌트 선택</DialogTitle>
          <DialogDescription>로그인할 테넌트를 선택해주세요.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2 max-h-[400px] overflow-y-auto">
          {tenants.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={loading}
              onClick={() => {
                if (loading) return;
                onSelect(t);
              }}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors',
                'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer',
                loading && 'opacity-60 cursor-not-allowed hover:border-gray-200 hover:bg-transparent',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate text-gray-800">{t.name || `테넌트 ${t.id}`}</span>
                  <span className="text-xs text-gray-500">ID: {t.id}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});

TenantSelectionDialog.displayName = 'TenantSelectionDialog';
