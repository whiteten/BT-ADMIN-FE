import { Button } from 'antd';
import { Building2, Edit, Lock, Phone, Shield, Trash2, User as UserIcon, Users } from 'lucide-react';
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
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLockStatusColor = (lockStatus: string) => {
    return lockStatus === '잠금' || lockStatus === '잠김' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  return (
    <Card className={cn('w-full mx-auto bg-white border-gray-200 shadow-md py-0', className)}>
      <CardContent className="p-4 space-y-4">
        <div className="border-b pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{userInfo.tenantName ?? ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-green-600" />
            <span className="font-semibold">{userInfo.userName ?? ''}</span>
            <span className="text-sm text-gray-500">({userInfo.userSabun ?? ''})</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3 w-3 text-purple-600" />
              <p className="text-gray-500 text-xs">직책</p>
            </div>
            <p className="font-medium">{userInfo.position ?? '-'}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <Building2 className="h-3 w-3 text-orange-600" />
              <p className="text-gray-500 text-xs">소속노드</p>
            </div>
            <p className="font-medium">{userInfo.nodeName ?? '-'}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3 w-3 text-indigo-600" />
              <p className="text-gray-500 text-xs">권한그룹</p>
            </div>
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {userInfo.grantName ?? '-'}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <Phone className="h-3 w-3 text-green-600" />
              <p className="text-gray-500 text-xs">전화번호</p>
            </div>
            <p className="font-medium">{userInfo.userTelNo ?? '-'}</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <UserIcon className="h-3 w-3 text-blue-600" />
                <p className="text-gray-500">현재상태</p>
              </div>
              <Badge className={cn('text-xs px-2 py-0', getStatusColor(userInfo.userStatusName ?? ''))}>{userInfo.userStatusName ?? '-'}</Badge>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <Lock className="h-3 w-3 text-red-600" />
                <p className="text-gray-500">계정상태</p>
              </div>
              <Badge className={cn('text-xs px-2 py-0', getLockStatusColor(userInfo.loginLock ?? ''))}>{userInfo.loginLock ?? '-'}</Badge>
            </div>
          </div>
        </div>

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
