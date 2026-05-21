/**
 * 역할 상세 - 권한 매핑 탭
 * - 비밀번호 정책 패턴 적용: 권한 선택 변경 시 Context에 실시간 반영
 * - 권한 선택기(PermissionSelector) 사용
 * - 저장 시 다른 역할 정보(roleCode, roleName 등)는 서버 데이터로 보존
 */

import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Row } from 'antd';
import { sharedApi } from '@/shared-api';
import { toast } from '@/shared-util';
import PermissionSelector from '../components/PermissionSelector';
import { useRoleDetailContext } from '../context/RoleDetailContext';
import { useGetRole, useUpdateRole } from '../hooks/useRoleQueries';
import type { RoleUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function RolePermissionTab() {
  const { roleId } = useParams();
  const queryClient = useQueryClient();
  const numericRoleId = roleId ? Number(roleId) : 0;

  // Context에서 권한 선택 상태 가져오기 (부모와 공유)
  const { selectedPermissions, setSelectedPermissions } = useRoleDetailContext();

  // 역할 조회
  const { data: role, isFetching } = useGetRole({
    params: { roleId: numericRoleId },
    queryOptions: { enabled: !!numericRoleId },
  });

  const { mutate: updateRole, isPending: isUpdating } = useUpdateRole({
    mutationOptions: {
      onSuccess: () => {
        toast.success('권한 매핑이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRole({ roleId: numericRoleId }).queryKey });
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRoles().queryKey });
      },
    },
  });

  const handleSave = () => {
    if (!numericRoleId || !role) return;

    // 저장 시 다른 역할 정보는 서버 데이터로 보존
    const request: RoleUpdateDatas = {
      // 기존 기본 정보 유지
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      sortOrder: role.sortOrder ?? 0,
      isUse: role.isUse,
      canResetPassword: role.canResetPassword,
      canManageResourceAccess: role.canManageResourceAccess,
      // 권한 매핑만 업데이트
      authKeys: Array.from(selectedPermissions),
    };
    updateRole({ params: { roleId: numericRoleId }, data: request });
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PermissionSelector value={selectedPermissions} onChange={setSelectedPermissions} className="h-full" />
      </div>
      <Row gutter={20} justify="center" className="shrink-0 bg-white z-10 py-3 border-t border-gray-100">
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} loading={isUpdating}>
            저장
          </Button>
        </Col>
      </Row>
    </div>
  );
}
