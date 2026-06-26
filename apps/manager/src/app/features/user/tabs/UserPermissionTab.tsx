/**
 * 사용자 상세 - 개별 권한 탭 (Replacement 모델)
 * - 전체 권한 목록이 항상 표시됨 (역할 범위 제한 없음)
 * - 개별권한이 없으면 → 역할 권한이 미리 체크됨 (템플릿)
 * - 개별권한이 있으면 → 그 권한만 체크됨 (역할 권한 무시)
 * - 사용자는 역할에 없는 권한도 자유롭게 선택 가능
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Col, Modal, Row } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import PermissionSelector from '../../iam/components/PermissionSelector';
import { useGetRole } from '../../iam/hooks/useRoleQueries';
import { useGetUserAuthMaps, useSyncUserPermissions, userAuthQueryKeys } from '../../iam/hooks/useUserAuthQueries';
import { useUserDetailContext } from '../context/UserDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function UserPermissionTab() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericUserId = userId ? Number(userId) : undefined;
  const { user, isUserFetching, setPermissionStats } = useUserDetailContext();

  // 현재 선택된 권한 키 목록
  const [selectedAuthKeys, setSelectedAuthKeys] = useState<Set<string>>(new Set());
  // 초기 상태 (변경 감지용)
  const [initialSelectedAuthKeys, setInitialSelectedAuthKeys] = useState<Set<string>>(new Set());
  // 개별권한 모드 여부 (DB에 데이터가 있는지)
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);

  // 사용자의 역할 조회 (템플릿용)
  const { data: role, isFetching: isRoleFetching } = useGetRole({
    params: { roleId: user?.roleId ?? 0 },
    queryOptions: { enabled: !!user?.roleId },
  });

  // 사용자 개별 권한 목록 조회
  const {
    data: existingMaps = [],
    isLoading: isMapLoading,
    refetch,
  } = useGetUserAuthMaps({
    params: { userId: numericUserId },
  });

  // 초기 상태 설정
  useEffect(() => {
    if (existingMaps.length > 0) {
      // 개별권한 있음 → 그 권한만 체크
      const authKeys = new Set(existingMaps.map((m) => m.authKey));
      setSelectedAuthKeys(authKeys);
      setInitialSelectedAuthKeys(new Set(authKeys));
      setHasCustomPermissions(true);
    } else if (role?.authKeys) {
      // 개별권한 없음 → 역할 권한을 템플릿으로 미리 체크
      const authKeys = new Set(role.authKeys);
      setSelectedAuthKeys(authKeys);
      setInitialSelectedAuthKeys(new Set(authKeys));
      setHasCustomPermissions(false);
    } else {
      // 역할도 없음 → 빈 상태
      setSelectedAuthKeys(new Set());
      setInitialSelectedAuthKeys(new Set());
      setHasCustomPermissions(false);
    }
  }, [existingMaps, role?.authKeys]);

  // 권한 통계를 Context에 전달 (우측 요약 표시용)
  useEffect(() => {
    const roleAuthCount = role?.authKeys?.length ?? 0;
    const customPermissionCount = hasCustomPermissions ? existingMaps.length : 0;

    setPermissionStats({
      roleAuthCount,
      selectedCount: selectedAuthKeys.size,
      savedAllowCount: customPermissionCount,
      savedDenyCount: 0, // Replacement 모델에서는 DENY 개념 없음
    });
  }, [role?.authKeys, selectedAuthKeys.size, existingMaps.length, hasCustomPermissions, setPermissionStats]);

  // 동기화 Mutation
  const { mutate: syncPermissions, isPending: isSyncing } = useSyncUserPermissions({
    mutationOptions: {
      onSuccess: (_data, variables) => {
        const isReset = variables.data.authKeys.length === 0;
        toast.success(isReset ? '역할 권한 모드로 초기화되었습니다.' : '개별 권한이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: userAuthQueryKeys.getList._def });
        refetch();
      },
    },
  });

  // 변경 여부 확인
  const hasChanges = useMemo(() => {
    if (selectedAuthKeys.size !== initialSelectedAuthKeys.size) return true;
    for (const key of selectedAuthKeys) {
      if (!initialSelectedAuthKeys.has(key)) return true;
    }
    return false;
  }, [selectedAuthKeys, initialSelectedAuthKeys]);

  // 저장 핸들러
  const handleSave = () => {
    if (!numericUserId) return;
    syncPermissions({
      userId: numericUserId,
      data: { authKeys: [...selectedAuthKeys] },
    });
  };

  // 역할 권한으로 초기화 (개별권한 전체 삭제 → 역할 권한을 동적으로 따름)
  const handleResetToRole = () => {
    if (!numericUserId) return;
    Modal.confirm({
      title: '역할 권한으로 초기화',
      content: '이 사용자의 개별 권한을 모두 삭제하고 역할 권한을 따르도록 전환합니다. 이후 역할 권한이 변경되면 자동으로 반영됩니다.',
      okText: '초기화',
      cancelText: '취소',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => syncPermissions({ userId: numericUserId, data: { authKeys: [] } }),
    });
  };

  const isLoading = isUserFetching || isRoleFetching || isMapLoading;

  if (isLoading || !numericUserId) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {hasCustomPermissions && (
        <Alert
          message="개별 권한이 설정되어 있습니다. 이 권한이 역할 권한을 대체합니다."
          type="warning"
          showIcon
          className="mb-3 shrink-0"
          action={
            <Button size="small" onClick={handleResetToRole} loading={isSyncing}>
              역할 권한으로 초기화
            </Button>
          }
        />
      )}

      {/* 권한 선택기 (전체 권한 표시) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PermissionSelector value={selectedAuthKeys} onChange={setSelectedAuthKeys} className="h-full" />
      </div>

      {/* 버튼 */}
      <Row gutter={20} justify="center" className="shrink-0 bg-white z-10 py-3 border-t border-gray-100">
        <Col>
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
        </Col>
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} loading={isSyncing} disabled={!hasChanges}>
            저장
          </Button>
        </Col>
      </Row>
    </div>
  );
}
