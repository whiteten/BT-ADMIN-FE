/**
 * 사용자 상세 - 개별 권한 탭
 * - PermissionSelector와 동일한 체크박스 트리 UI
 * - 기본값: 역할에 포함된 권한이 체크됨
 * - 저장 시 선택된 권한 ID만 전송, 백엔드가 역할과 비교하여 ALLOW/DENY 결정
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Row } from 'antd';
import { toast } from '@/shared-util';
import UserPermissionSelector from '../../../features/iam/components/UserPermissionSelector';
import { useGetRole } from '../../../features/iam/hooks/useRoleQueries';
import { useGetUserAuthMaps, useSyncUserPermissions } from '../../../features/iam/hooks/useUserAuthQueries';
import { useGetUser } from '../../../features/user/hooks/useUserQueries';
import { useUserDetailContext } from '../context/UserDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function UserPermissionTab() {
  const { userId } = useParams();
  const numericUserId = userId ? Number(userId) : undefined;
  const { setPermissionStats } = useUserDetailContext();

  // 현재 선택된 권한 ID 목록 (역할 기본 + 개별 설정 반영)
  const [selectedAuthIds, setSelectedAuthIds] = useState<Set<number>>(new Set());
  // 초기 상태 (변경 감지용)
  const [initialSelectedAuthIds, setInitialSelectedAuthIds] = useState<Set<number>>(new Set());

  // 사용자 조회
  const { data: user, isFetching: isUserFetching } = useGetUser({
    params: { userId: numericUserId },
    queryOptions: { enabled: !!numericUserId },
  });

  // 사용자의 역할 조회 (역할에 포함된 권한 목록)
  const { data: role, isFetching: isRoleFetching } = useGetRole({
    params: { roleId: user?.roleId ?? 0 },
    queryOptions: { enabled: !!user?.roleId },
  });

  // 쿼리 파라미터 (해당 사용자만 조회)
  const queryParams = useMemo(
    () => ({
      userId: numericUserId,
    }),
    [numericUserId],
  );

  // 사용자 권한 매핑 목록 조회 (기존 개별 설정)
  const {
    data: existingMaps = [],
    isLoading: isMapLoading,
    refetch,
  } = useGetUserAuthMaps({
    params: queryParams,
  });

  // 역할에 포함된 권한 ID Set
  const roleAuthIds = useMemo(() => {
    return new Set(role?.authIds ?? []);
  }, [role?.authIds]);

  // 기존 매핑 데이터를 기반으로 초기 선택 상태 계산
  useEffect(() => {
    // 역할 권한을 기본으로
    const selected = new Set(roleAuthIds);

    // 기존 매핑 적용
    existingMaps.forEach((item) => {
      if (item.effect === 'ALLOW') {
        selected.add(item.authId); // ALLOW: 추가
      } else if (item.effect === 'DENY') {
        selected.delete(item.authId); // DENY: 제거
      }
    });

    setSelectedAuthIds(selected);
    setInitialSelectedAuthIds(new Set(selected));
  }, [roleAuthIds, existingMaps]);

  // 권한 통계를 Context에 전달 (우측 요약 표시용)
  useEffect(() => {
    let savedAllowCount = 0;
    let savedDenyCount = 0;
    existingMaps.forEach((m) => {
      if (m.effect === 'ALLOW') savedAllowCount++;
      else if (m.effect === 'DENY') savedDenyCount++;
    });

    setPermissionStats({
      roleAuthCount: roleAuthIds.size,
      selectedCount: selectedAuthIds.size,
      savedAllowCount,
      savedDenyCount,
    });
  }, [roleAuthIds.size, selectedAuthIds.size, existingMaps, setPermissionStats]);

  // 동기화 Mutation
  const { mutate: syncPermissions, isPending: isSyncing } = useSyncUserPermissions({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success(`권한 설정이 저장되었습니다. (추가: ${result.allowCount}, 차단: ${result.denyCount})`);
        refetch();
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '권한 설정 저장에 실패했습니다.';
        toast.error(errorMessage);
      },
    },
  });

  // 변경 여부 확인
  const hasChanges = useMemo(() => {
    return !areSetsEqual(selectedAuthIds, initialSelectedAuthIds);
  }, [selectedAuthIds, initialSelectedAuthIds]);

  // 변경 통계 (UI 표시용)
  const changeStats = useMemo(() => {
    // 선택 추가: 초기에 없었는데 현재 있음
    const added = [...selectedAuthIds].filter((id) => !initialSelectedAuthIds.has(id)).length;
    // 선택 제거: 초기에 있었는데 현재 없음
    const removed = [...initialSelectedAuthIds].filter((id) => !selectedAuthIds.has(id)).length;
    return { added, removed };
  }, [selectedAuthIds, initialSelectedAuthIds]);

  // 저장 핸들러 (단일 API 호출)
  const handleSave = () => {
    if (!numericUserId || !hasChanges) return;

    syncPermissions({
      userId: numericUserId,
      data: { authIds: [...selectedAuthIds] },
    });
  };

  // 취소 핸들러 (초기 상태로 복원)
  const handleCancel = () => {
    setSelectedAuthIds(new Set(initialSelectedAuthIds));
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
    <div className="flex flex-col h-full">
      {/* 권한 선택기 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <UserPermissionSelector roleAuthIds={roleAuthIds} selectedAuthIds={selectedAuthIds} existingMaps={existingMaps} onChange={setSelectedAuthIds} readOnly={isSyncing} />
        </div>
      </div>

      {/* 저장/취소 버튼 */}
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-4 pt-4 border-t border-gray-100">
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} loading={isSyncing} disabled={!hasChanges}>
            저장
            {hasChanges && (
              <span className="ml-1 text-xs">
                ({changeStats.added > 0 && `+${changeStats.added}`}
                {changeStats.removed > 0 && changeStats.added > 0 && ', '}
                {changeStats.removed > 0 && `-${changeStats.removed}`})
              </span>
            )}
          </Button>
        </Col>
        <Col>
          <Button onClick={handleCancel} disabled={!hasChanges || isSyncing}>
            취소
          </Button>
        </Col>
      </Row>
    </div>
  );
}

// Set 비교 유틸
function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
