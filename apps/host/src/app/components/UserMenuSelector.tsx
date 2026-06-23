import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Dot, KeyRound, LogOut, Repeat } from 'lucide-react';
import { type TenantSummary, useAuthStore, useMenuStore, useNavigationStore, useRemoteAvailabilityStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { type ChangePasswordData, ChangePasswordDialog, type ChangePasswordDialogRef } from './ChangePasswordDialog';
import { TenantSwitchDialog, type TenantSwitchDialogRef } from './TenantSwitchDialog';
import { authApi } from '../features/auth/api/authApi';
import { useChangePassword, useLogout } from '../features/auth/hooks/useAuthQueries';
import type { PasswordPolicy } from '../features/auth/types/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export default function UserMenuSelector() {
  const navigate = useNavigate();
  const { userInfo, getCurrentRoleName, reset } = useAuthStore();
  const changePasswordDialogRef = useRef<ChangePasswordDialogRef>(null);
  const tenantSwitchDialogRef = useRef<TenantSwitchDialogRef>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);

  const { mutate: logout } = useLogout({
    mutationOptions: {
      onSettled: () => {
        // 세션 관련 스토어 일괄 초기화 — 재로그인 시 SharedInfoProvider 재마운트로 다시 set되지만,
        // 비우지 않으면 fetch 완료 전까지 이전 사용자의 메뉴·권한·가용성이 잔존(권한 다른 계정 재로그인 시 정보 노출).
        reset(); // authStore
        useNavigationStore.getState().reset();
        useMenuStore.getState().reset();
        useRemoteAvailabilityStore.getState().reset();
        navigate('/login');
      },
    },
  });

  const { mutateAsync: changePassword } = useChangePassword();

  const handleLogout = () => {
    logout();
  };

  // 비밀번호 변경 클릭 핸들러
  const handleChangePasswordClick = async () => {
    if (!userInfo?.tenant) {
      toast.error('테넌트 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      // 계정 정책 조회
      const policy = await authApi.getAccountPolicy(Number(userInfo.tenant));
      setPasswordPolicy(policy);

      // Dialog 열기
      changePasswordDialogRef.current?.open({
        mode: 'manual',
        userId: userInfo.userAccount,
      });
    } catch {
      toast.error('비밀번호 정책을 불러오는데 실패했습니다.');
    }
  };

  // 비밀번호 변경 처리
  const handlePasswordChange = async (data: ChangePasswordData) => {
    if (!userInfo?.userId) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    if (!data.currentPassword) {
      throw new Error('현재 비밀번호를 입력해주세요.');
    }

    await changePassword({
      userId: userInfo.userId,
      data: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });
  };

  const username = userInfo?.username ?? userInfo?.userAccount ?? '-';
  const userAccount = userInfo?.userAccount ?? '-';
  const roleName = getCurrentRoleName();
  const tenantName = userInfo?.tenantName?.trim() ? userInfo.tenantName : userInfo?.tenant ? `테넌트 ${userInfo.tenant}` : '-';
  const availableTenants = userInfo?.availableTenants ?? [];
  const isMultiTenant = availableTenants.length > 1;

  // 테넌트 선택 시 호출: 서버에 전환 요청 → 성공 시 페이지 리로드
  const handleTenantSelect = async (tenant: TenantSummary) => {
    try {
      await authApi.switchTenant(tenant.tenantId);
      toast.success(`${tenant.tenantName} 테넌트로 전환되었습니다.`);
      // 새 토큰의 권한/메뉴/테넌트명이 모든 화면에 반영되도록 리로드
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

  const initials = (username || '?').trim().charAt(0).toUpperCase();

  const TriggerBtn = (
    <Button
      variant="ghost"
      className={cn(
        'group flex items-center h-10 pl-1 pr-2.5 gap-2 rounded-full',
        'text-white hover:bg-white/15 hover:text-white focus-visible:bg-white/15 focus-visible:text-white',
        'transition-colors hover:cursor-pointer',
      )}
    >
      <Avatar className="h-8 w-8 rounded-full ring-1 ring-white/40 bg-gradient-to-br from-white/35 to-white/5 shadow-sm">
        <AvatarFallback className="rounded-full bg-transparent text-white text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start text-left leading-tight">
        <span className="truncate text-sm font-semibold text-white max-w-40 leading-tight">{username}</span>
        <span className="truncate text-[11px] text-white/70 max-w-40 leading-none mt-0.5">{tenantName}</span>
      </div>
      <ChevronDown className="size-3.5 text-white/60 group-hover:text-white/90 transition-colors ml-0.5" />
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{TriggerBtn}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit min-w-72 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex p-2">
            <span className="text-base text-center w-full break-words">
              <span className="font-bold">{username}</span> 님 환영합니다.
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex flex-col text-sm p-2 text-gray-600 dark:text-gray-300 gap-1">
            <div className="flex items-center">
              <Dot className="h-4 w-4" />
              <span className="">계정 :</span>
              <span className="ml-1">{userAccount}</span>
            </div>
            <div className="flex items-center">
              <Dot className="h-4 w-4" />
              <span className="">테넌트 :</span>
              <span className="ml-1 font-medium text-gray-800 dark:text-gray-100">{tenantName}</span>
            </div>
            <div className="flex items-center">
              <Dot className="h-4 w-4" />
              <span className="">등급 :</span>
              <Badge variant="outline" className="ml-1 h-[15px] text-xs p-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {roleName}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isMultiTenant && (
            <DropdownMenuItem className="hover:cursor-pointer" onSelect={() => tenantSwitchDialogRef.current?.open()}>
              <Repeat />
              테넌트 전환
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="hover:cursor-pointer" onSelect={handleChangePasswordClick}>
            <KeyRound />
            비밀번호 변경
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:cursor-pointer" onSelect={() => handleLogout()}>
          <LogOut className="text-red-500  dark:text-red-400" />
          <span className="text-red-500  dark:text-red-400 font-medium">로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* 비밀번호 변경 Dialog */}
      <ChangePasswordDialog
        ref={changePasswordDialogRef}
        policy={passwordPolicy ?? undefined}
        onPasswordChange={handlePasswordChange}
        onSuccess={() => toast.success('비밀번호가 변경되었습니다.')}
        onError={(error) => toast.error(error.message || '비밀번호 변경에 실패했습니다.')}
      />

      {/* 테넌트 전환 Dialog */}
      <TenantSwitchDialog ref={tenantSwitchDialogRef} currentTenantId={userInfo?.tenant ?? ''} availableTenants={availableTenants} onSelect={handleTenantSelect} />
    </DropdownMenu>
  );
}
