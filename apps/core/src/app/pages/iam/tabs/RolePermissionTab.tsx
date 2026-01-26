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
import PermissionSelector from '../../../features/iam/components/PermissionSelector';
import { useGetRole, useUpdateRoleMutation } from '../../../features/iam/hooks/useRoleQueries';
import type { RoleUpdateRequest } from '../../../features/iam/types/iam.types';
import { useRoleDetailContext } from '../context/RoleDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function RolePermissionTab() {
  const { roleId } = useParams();
  const queryClient = useQueryClient();
  const numericRoleId = roleId ? Number(roleId) : 0;

  // Context에서 권한 선택 상태 가져오기 (부모와 공유)
  const { selectedPermissions, setSelectedPermissions } = useRoleDetailContext();

  // 역할 조회
  const { data: role, isFetching } = useGetRole({ roleId: numericRoleId }, { queryOptions: { enabled: !!numericRoleId } });

  const { mutate: updateRole, isPending: isUpdating } = useUpdateRoleMutation({
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
    const request: RoleUpdateRequest = {
      // 기존 기본 정보 유지
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      sortOrder: role.sortOrder ?? 0,
      isUse: role.isUse,
      // 권한 매핑만 업데이트
      authIds: Array.from(selectedPermissions),
    };
    updateRole({ roleId: numericRoleId, request });
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4"></div>

      <div className="flex-1 min-h-0">
        <PermissionSelector value={selectedPermissions} onChange={setSelectedPermissions} />
      </div>

      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-7 pt-4 mt-6 border-t border-gray-100">
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} loading={isUpdating}>
            저장
          </Button>
        </Col>
      </Row>
    </div>
  );
}
