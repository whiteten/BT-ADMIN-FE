import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronsUpDown, LogOut, ShieldCheck } from 'lucide-react';
import { type TenantSummary, useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { authApi } from '../features/auth/api/authApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/libs/shared-ui/src/lib/utils';

/**
 * 전역 헤더 테넌트 칩.
 * - 활성 테넌트명을 헤더에 상시 표시하고, 클릭 시 드롭다운으로 테넌트 전환.
 * - 시스템 관리자는 최상단에 "운영자 모드(전체 테넌트)" 항목이 추가된다(통합운영 브랜치 E).
 *   운영자 모드가 켜지면 칩이 앰버로 강조되고, 화면이 전체/대행 스코프로 전환된다.
 * - 렌더 조건: 멀티테넌트 사용자 또는 시스템 관리자.
 */
export default function TenantChip() {
  const navigate = useNavigate();
  const { userInfo } = useAuthStore();
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const enterOperator = useOperatorScopeStore((s) => s.enter);
  const exitOperator = useOperatorScopeStore((s) => s.exit);

  const availableTenants = userInfo?.availableTenants ?? [];
  const isMultiTenant = availableTenants.length > 1;
  const isSystemAdmin = !!userInfo?.isSystemAdmin;
  const currentTenantId = userInfo?.tenant ?? '';
  const tenantName = userInfo?.tenantName?.trim() ? userInfo.tenantName : userInfo?.tenant ? `테넌트 ${userInfo.tenant}` : '-';

  // 테넌트 선택: (운영자 모드였다면 해제 후) 세션 전환 → 리로드로 새 토큰 반영
  const handleTenantSelect = async (tenant: TenantSummary) => {
    try {
      exitOperator();
      await authApi.switchTenant(tenant.tenantId);
      toast.success(`${tenant.tenantName} 테넌트로 전환되었습니다.`);
      window.location.reload();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { code?: string; message?: string } } };
      const code = error?.response?.data?.code;
      if (code === 'TENANT_ACCESS_DENIED') {
        toast.error('해당 테넌트에 접근 권한이 없습니다.');
      } else if (code === 'UNAUTHENTICATED') {
        toast.error('세션이 만료되었습니다. 다시 로그인하세요.');
        navigate('/login');
      } else {
        toast.error(error?.response?.data?.message ?? '테넌트 전환에 실패했습니다.');
      }
    }
  };

  // 멀티테넌트도 아니고 시스템 관리자도 아니면 칩 불필요
  if (!isMultiTenant && !isSystemAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={operatorMode ? '운영자 모드 — 클릭하여 전환/종료' : '테넌트 전환'}
          className={cn(
            'group inline-flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-full transition-colors cursor-pointer max-w-[240px]',
            operatorMode ? 'bg-amber-500/85 text-white ring-1 ring-amber-300/60 hover:bg-amber-500' : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20',
          )}
        >
          {operatorMode ? <ShieldCheck className="size-4 shrink-0" /> : <Building2 className="size-4 shrink-0 text-white/80" />}
          <span className="truncate text-sm font-medium leading-none">{operatorMode ? '운영자 모드 · 전체' : tenantName}</span>
          <ChevronsUpDown className={cn('size-3.5 shrink-0', operatorMode ? 'text-white/80' : 'text-white/60 group-hover:text-white/90')} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-lg">
        {isSystemAdmin &&
          (operatorMode ? (
            <DropdownMenuItem className="hover:cursor-pointer" onSelect={() => exitOperator()}>
              <LogOut className="text-gray-500" />
              일반 콘솔로 나가기
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="hover:cursor-pointer font-semibold text-amber-700 focus:text-amber-700 focus:bg-amber-50" onSelect={() => enterOperator()}>
              <ShieldCheck className="text-amber-600" />
              운영자 모드 (전체 테넌트)
            </DropdownMenuItem>
          ))}

        {isSystemAdmin && isMultiTenant && <DropdownMenuSeparator />}

        {isMultiTenant && (
          <>
            <DropdownMenuLabel className="text-xs text-gray-500 font-normal">테넌트 전환</DropdownMenuLabel>
            {availableTenants.map((t) => {
              const idStr = String(t.tenantId);
              const isCurrent = idStr === currentTenantId && !operatorMode;
              return (
                <DropdownMenuItem key={idStr} className="hover:cursor-pointer" onSelect={() => handleTenantSelect(t)}>
                  {isCurrent ? <Check className="text-blue-600" /> : <Building2 className="text-gray-400" />}
                  <span className={cn('truncate', isCurrent && 'font-semibold text-blue-700')}>{t.tenantName}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
