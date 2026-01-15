/**
 * 역할 관리 탭
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal } from 'antd';
import { Plus, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { RoleCard } from '../components/RoleCard';
import RoleDrawer, { type RoleDrawerRef } from '../components/RoleDrawer';
import { roleQueryKeys, useDeleteRoleMutation, useGetRoles } from '../hooks/useRoleQueries';
import type { Role } from '../types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

export default function RoleManagementTab() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const drawerRef = useRef<RoleDrawerRef>(null);
  const queryClient = useQueryClient();

  // API 연동: 역할 목록 조회
  const { data: rolesData = [], isLoading: loading } = useGetRoles();

  // 역할 삭제 Mutation
  const { mutate: deleteRole } = useDeleteRoleMutation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('역할이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: roleQueryKeys.getRoles._def });
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '역할 삭제에 실패했습니다.';
        toast.error(errorMessage);
      },
    },
  });

  // 클라이언트 사이드 필터링
  const roles = useMemo(() => {
    if (!keyword) return rolesData;
    const searchKeyword = keyword.toLowerCase();
    return rolesData.filter((r) => r.roleName.toLowerCase().includes(searchKeyword) || r.roleCode.toLowerCase().includes(searchKeyword));
  }, [rolesData, keyword]);

  const handleSearch = () => {
    // 클라이언트 사이드 필터링이므로 별도 액션 불필요
  };

  const handleCreate = () => {
    // 스텝 방식 역할 생성 페이지로 이동
    navigate('/core/role/create');
  };

  const handleEdit = (role: Role) => {
    drawerRef.current?.open({ mode: 'edit', role });
  };

  const handleDelete = (role: Role) => {
    Modal.confirm({
      title: '역할 삭제',
      content: `"${role.roleName}" 역할을 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => deleteRole({ roleId: role.roleId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
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

      {/* 역할 추가/수정 Drawer */}
      <RoleDrawer ref={drawerRef} />
    </div>
  );
}
