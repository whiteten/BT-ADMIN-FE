import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Dot, KeyRound, LogOut } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { authApi } from '../features/auth/api/authApi';
import { useChangePassword, useLogout } from '../features/auth/hooks/useAuthQueries';
import type { PasswordPolicy } from '../features/auth/types/auth';
import { type ChangePasswordData, ChangePasswordDialog, type ChangePasswordDialogRef } from '@/components/custom/ChangePasswordDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);

  const { mutate: logout } = useLogout({
    mutationOptions: {
      onSettled: () => {
        reset(); // 스토어 초기화
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

  const TriggerBtn = (
    <Button variant="ghost" className={cn('flex justify-start min-w-[170px] h-full p-1.5 hover:cursor-pointer')}>
      <>
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src="assets/images/icon/icon-user.svg" alt="User Icon" />
          <AvatarFallback className="rounded-lg">USR</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold max-w-48">{username}</span>
          <Badge variant="outline" className="w-fit h-[15px] text-xs p-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {roleName}
          </Badge>
        </div>
      </>
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
              <span className="">등급 :</span>
              <Badge variant="outline" className="ml-1 h-[15px] text-xs p-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {roleName}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
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
    </DropdownMenu>
  );
}
