/**
 * 역할 카드 컴포넌트
 * - 역할 정보를 시각적으로 표시하는 카드 UI
 * - 권한 수, 사용자 수, 상태 등을 직관적으로 표현
 */

import { Card, Tag } from 'antd';
import { Edit, MoreVertical, Shield, Trash2, Users } from 'lucide-react';

import type { Role } from '../types/iam.types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface RoleCardProps {
  role: Role;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function RoleCard({ role, onEdit, onDelete, className }: RoleCardProps) {
  const { roleCode, roleName, description, permissionCount, userCount, isUse, createdAt } = role;

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="size-4" />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="hover:cursor-pointer"
        >
          <Edit className="size-4 mr-2" />
          상세보기
        </DropdownMenuItem>
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600 focus:text-red-600 hover:cursor-pointer"
            >
              <Trash2 className="size-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card title={roleName} extra={extra} className={className} styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px' } }} hoverable onClick={onEdit}>
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex items-center">
          <span className="w-[90px] text-gray-500">역할코드</span>
          <Tag color="blue" className="font-mono text-xs">
            {roleCode}
          </Tag>
        </div>
        <div className="flex items-center">
          <span className="w-[90px] text-gray-500">사용여부</span>
          <Tag color={isUse ? 'green' : 'default'}>{isUse ? '사용' : '미사용'}</Tag>
        </div>
        {description && (
          <div className="flex">
            <span className="w-[90px] text-gray-500 shrink-0">설명</span>
            <span className="flex-1 truncate text-gray-700" title={description}>
              {description}
            </span>
          </div>
        )}
        <div className="flex items-center">
          <span className="w-[90px] text-gray-500">등록일</span>
          <span className="text-gray-700">{createdAt?.split('T')[0]}</span>
        </div>
        {/* 하단 통계 */}
        <div className="flex items-center gap-4 pt-3 mt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <Shield className="size-4 text-blue-500" />
            <span className="text-sm text-gray-600">권한</span>
            <span className="font-semibold text-gray-800">{permissionCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-green-500" />
            <span className="text-sm text-gray-600">사용자</span>
            <span className="font-semibold text-gray-800">{userCount ?? 0}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
