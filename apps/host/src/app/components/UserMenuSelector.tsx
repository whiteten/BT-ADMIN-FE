import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Dot, History, KeyRound, LogOut } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { useLogout } from '../features/auth/hooks/useAuthQueries';
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

  const { mutate: logout } = useLogout({
    mutationOptions: {
      onSettled: () => {
        reset(); // 스토어 초기화
        navigate('/login');
      },
    },
  });

  const handleLogout = () => {
    logout();
  };

  const username = userInfo?.username ?? '-';
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
              <span className="ml-1">{username}</span>
            </div>
            <div className="flex items-center">
              <Dot className="h-4 w-4" />
              <span className="">등급 :</span>
              <Badge variant="outline" className="ml-1 h-[15px] text-xs p-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {roleName}
              </Badge>
            </div>
            <div className="flex items-center">
              <Dot className="h-4 w-4" />
              <span className="">최근 접속일 :</span>
              <span className="ml-1">{dayjs().format('YY-MM-DD HH:mm:ss')}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer">
            <KeyRound />
            비밀번호 변경
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer">
            <History />
            로그인 이력
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:cursor-pointer" onSelect={() => handleLogout()}>
          <LogOut className="text-red-500  dark:text-red-400" />
          <span className="text-red-500  dark:text-red-400 font-medium">로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
