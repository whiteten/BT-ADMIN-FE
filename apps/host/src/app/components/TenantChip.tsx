import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronsUpDown } from 'lucide-react';
import { type TenantSummary, useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { TenantSwitchDialog, type TenantSwitchDialogRef } from './TenantSwitchDialog';
import { authApi } from '../features/auth/api/authApi';

/**
 * 전역 헤더 테넌트 칩.
 * - 활성 테넌트명을 헤더에 상시 표시하고, 클릭 시 테넌트 전환 다이얼로그를 연다.
 * - 접근 가능한 테넌트가 2개 이상인 사용자에게만 렌더(단일 테넌트는 전환 불필요).
 * - 화면 내 "전체+테넌트" 카드 선택기를 대체하는 단일 진입점(멀티테넌트 개편 브랜치 C).
 */
export default function TenantChip() {
  const navigate = useNavigate();
  const { userInfo } = useAuthStore();
  const dialogRef = useRef<TenantSwitchDialogRef>(null);

  const availableTenants = userInfo?.availableTenants ?? [];
  const isMultiTenant = availableTenants.length > 1;
  const tenantName = userInfo?.tenantName?.trim() ? userInfo.tenantName : userInfo?.tenant ? `테넌트 ${userInfo.tenant}` : '-';

  // 테넌트 선택 시: 서버에 전환 요청 → 성공 시 페이지 리로드(새 토큰의 권한/메뉴/테넌트명 반영)
  const handleTenantSelect = async (tenant: TenantSummary) => {
    try {
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

  // 멀티테넌트 사용자에게만 전환 칩 노출
  if (!isMultiTenant) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.open()}
        title="테넌트 전환"
        aria-label={`현재 테넌트: ${tenantName}. 클릭하여 전환`}
        className="group inline-flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-full bg-white/10 ring-1 ring-white/15 text-white hover:bg-white/20 transition-colors cursor-pointer max-w-[220px]"
      >
        <Building2 className="size-4 shrink-0 text-white/80" />
        <span className="truncate text-sm font-medium leading-none">{tenantName}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-white/60 group-hover:text-white/90 transition-colors" />
      </button>

      <TenantSwitchDialog ref={dialogRef} currentTenantId={userInfo?.tenant ?? ''} availableTenants={availableTenants} onSelect={handleTenantSelect} />
    </>
  );
}
