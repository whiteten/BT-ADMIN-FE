/**
 * 역할 관리 탭
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, message } from 'antd';
import { CheckCircle, Plus, Search, Shield, Users } from 'lucide-react';
import { RoleCard } from '../components/RoleCard';
import { roleDummyData } from '../data/iam-dummy';
import type { Role } from '../types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: number;
  valueColor?: string;
}

function StatCard({ icon: Icon, iconBg, label, value, valueColor = 'text-gray-900' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', iconBg)}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={cn('text-xl font-bold', valueColor)}>{value}</div>
      </div>
    </div>
  );
}

export default function RoleManagementTab() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const handleSearch = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const filtered = keyword ? roleDummyData.filter((r) => r.roleName.includes(keyword) || r.roleCode.includes(keyword.toUpperCase())) : roleDummyData;
      setRoles(filtered);
      setLoading(false);
    }, 300);
  }, [keyword]);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleCreate = () => {
    navigate('../role/create');
  };

  const handleEdit = (role: Role) => {
    navigate(`../role/${role.roleId}`);
  };

  const handleDelete = (role: Role) => {
    Modal.confirm({
      title: '역할 삭제',
      content: `"${role.roleName}" 역할을 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        message.success('역할이 삭제되었습니다.');
        handleSearch();
      },
    });
  };

  // 통계 계산
  const stats = useMemo(
    () => ({
      total: roles.length,
      active: roles.filter((r) => r.useYn === 'Y').length,
      totalPermissions: roles.reduce((sum, r) => sum + (r.permissionCount || 0), 0),
      totalUsers: roles.reduce((sum, r) => sum + (r.userCount || 0), 0),
    }),
    [roles],
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Shield} iconBg="from-blue-500 to-indigo-600" label="전체 역할" value={stats.total} />
        <StatCard icon={CheckCircle} iconBg="from-green-500 to-emerald-600" label="활성 역할" value={stats.active} valueColor="text-green-600" />
        <StatCard icon={Shield} iconBg="from-purple-500 to-violet-600" label="총 권한 수" value={stats.totalPermissions} valueColor="text-purple-600" />
        <StatCard icon={Users} iconBg="from-orange-500 to-amber-600" label="총 사용자" value={stats.totalUsers} valueColor="text-orange-600" />
      </div>

      {/* 필터 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Input placeholder="역할명 또는 코드 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} className="!w-[250px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </div>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
          역할 추가
        </Button>
      </div>

      {/* 카드 그리드 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : roles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roles.map((role) => (
              <RoleCard key={role.roleId} role={role} onEdit={() => handleEdit(role)} onDelete={() => handleDelete(role)} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <NoData message="검색 결과가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
          </div>
        )}
      </div>
    </div>
  );
}
