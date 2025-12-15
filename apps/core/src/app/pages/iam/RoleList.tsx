/**
 * 역할 목록 페이지
 * - 카드형 UI로 역할 정보를 직관적으로 표시
 * - 역할 검색, 추가, 상세 조회 기능
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Space, message } from 'antd';
import { CheckCircle, Plus, Search, Shield, Users } from 'lucide-react';

import { RoleCard } from '../../features/iam/components/RoleCard';
import { roleDummyData } from '../../features/iam/data/iam-dummy';
import type { Role } from '../../features/iam/types/iam.types';

import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

export default function RoleList() {
  const navigate = useNavigate();

  const [rowData, setRowData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // 역할 추가 페이지로 이동
  const handleCreate = () => {
    navigate('../role/create');
  };

  // 역할 상세 페이지로 이동
  const handleEdit = (roleId: number | undefined) => {
    if (roleId) {
      navigate(`../role/${roleId}`);
    }
  };

  // 역할 삭제
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

  // 검색 실행
  const handleSearch = useCallback(() => {
    setRowData([]);
    setLoading(true);

    // API 호출 시뮬레이션
    setTimeout(() => {
      const filtered = keyword ? roleDummyData.filter((role) => role.roleName.includes(keyword) || role.roleCode.includes(keyword.toUpperCase())) : roleDummyData;
      setRowData(filtered);
      setLoading(false);
    }, 300);
  }, [keyword]);

  // 초기 로드
  useEffect(() => {
    handleSearch();
  }, []);

  // 통계 계산
  const stats = {
    total: rowData.length,
    active: rowData.filter((r) => r.useYn === 'Y').length,
    totalPermissions: rowData.reduce((sum, r) => sum + (r.permissionCount || 0), 0),
    totalUsers: rowData.reduce((sum, r) => sum + (r.userCount || 0), 0),
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">전체 역할</div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow">
            <CheckCircle className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">활성 역할</div>
            <div className="text-xl font-bold text-green-600">{stats.active}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">총 권한 수</div>
            <div className="text-xl font-bold text-purple-600">{stats.totalPermissions}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">총 사용자</div>
            <div className="text-xl font-bold text-orange-600">{stats.totalUsers}</div>
          </div>
        </div>
      </div>

      {/* 헤더 영역 - 검색 및 추가 버튼 */}
      <header className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between">
        {/* 검색 영역 */}
        <div className="flex gap-2 w-full">
          <Space.Compact className="w-full lg:w-auto">
            <Input
              className="!w-full lg:!w-[300px]"
              placeholder="역할명 또는 역할코드로 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" onClick={handleSearch} icon={<Search className="size-4" />}>
              검색
            </Button>
          </Space.Compact>
        </div>

        {/* 추가 버튼 */}
        <div className="flex gap-2 justify-end">
          <Button type="primary" onClick={handleCreate} icon={<Plus className="size-4" />}>
            역할 추가
          </Button>
        </div>
      </header>

      {/* 본문 영역 - 카드 그리드 */}
      <div className="w-full flex-1 overflow-y-auto">
        {loading ? (
          <FallbackSpinner />
        ) : rowData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rowData.map((role) => (
              <RoleCard key={role.roleId} role={role} onEdit={() => handleEdit(role.roleId)} onDelete={() => handleDelete(role)} />
            ))}
          </div>
        ) : (
          <NoData message="검색 버튼을 클릭하여 역할 목록을 조회하세요." />
        )}
      </div>
    </div>
  );
}
