import { Button } from 'antd';
import dayjs from 'dayjs';
import { Building2, Calendar, Edit, Key, LogIn, Shield, Trash2, UserCircle, User as UserIcon } from 'lucide-react';
import type { User } from '../../features/user/types/user.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UserInfoCardProps {
  userInfo: User;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function UserInfoCard({ userInfo, className, onEdit, onDelete }: UserInfoCardProps) {
  const getEnabledColor = (enabled: boolean) => {
    return enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
  };

  return (
    <Card className={cn('w-full mx-auto bg-white border-gray-200 shadow-md py-0', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="border-b pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{userInfo.tenantName ?? '테넌트 없음'}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-green-600" />
            <span className="font-semibold">{userInfo.username}</span>
            <span className="text-sm text-gray-500">(ID: {userInfo.id})</span>
          </div>
        </div>

        {/* Account & Role */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <UserCircle className="h-3 w-3 text-cyan-600" />
              <p className="text-gray-500 text-xs">계정</p>
            </div>
            <p className="font-medium text-xs">{userInfo.userAccount ?? '-'}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3 w-3 text-indigo-600" />
              <p className="text-gray-500 text-xs">권한</p>
            </div>
            <p className="font-medium text-xs">{userInfo.roleName ?? '-'}</p>
          </div>
        </div>

        {/* Status */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3 w-3 text-purple-600" />
              <p className="text-gray-500 text-xs">상태</p>
            </div>
            <Badge className={cn('text-xs px-2 py-0', getEnabledColor(userInfo.enabled))}>{userInfo.enabled ? '활성' : '비활성'}</Badge>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <Key className="h-3 w-3 text-orange-600" />
              <p className="text-gray-500 text-xs">비밀번호 변경 필요</p>
            </div>
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {userInfo.forcePasswordChange ? '예' : '아니오'}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <LogIn className="h-3 w-3 text-green-600" />
              <p className="text-gray-500 text-xs">최근 로그인</p>
            </div>
            <p className="font-medium text-xs">{formatDate(userInfo.lastLoginAt)}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3 text-blue-600" />
              <p className="text-gray-500 text-xs">생성일</p>
            </div>
            <p className="font-medium text-xs">{formatDate(userInfo.createdAt)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            type="primary"
            icon={<Edit className="h-3.5 w-3.5" />}
            onClick={onEdit}
            className="flex-1 flex items-center justify-center"
            style={{
              backgroundColor: '#1890ff',
              borderColor: '#1890ff',
              height: '32px',
              fontSize: '13px',
            }}
          >
            수정
          </Button>
          <Button
            danger
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDelete}
            className="flex-1 flex items-center justify-center"
            style={{
              height: '32px',
              fontSize: '13px',
            }}
          >
            삭제
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
