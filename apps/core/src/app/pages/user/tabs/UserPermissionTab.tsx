/**
 * 사용자 상세 - 개별 권한 탭
 * - PermissionSelector와 동일한 체크박스 트리 UI
 * - 기본값: 역할에 포함된 권한이 체크됨
 * - 체크 추가: 역할에 없던 권한 → ALLOW로 저장
 * - 체크 해제: 역할에 있던 권한 → DENY로 저장
 * - 저장 시 변경분만 TB_BT_CM_USER_AUTH_MAP에 반영
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Row } from 'antd';
import { toast } from '@/shared-util';
import UserPermissionSelector from '../../../features/iam/components/UserPermissionSelector';
import { useGetRole } from '../../../features/iam/hooks/useRoleQueries';
import { useCreateUserAuthMap, useDeleteUserAuthMap, useGetUserAuthMaps } from '../../../features/iam/hooks/useUserAuthQueries';
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

  // 생성 Mutation
  const { mutate: createMap, isPending: isCreating } = useCreateUserAuthMap({
    mutationOptions: {
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '권한 설정 저장에 실패했습니다.';
        toast.error(errorMessage);
      },
    },
  });

  // 삭제 Mutation
  const { mutate: deleteMap, isPending: isDeleting } = useDeleteUserAuthMap({
    mutationOptions: {
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '권한 설정 삭제에 실패했습니다.';
        toast.error(errorMessage);
      },
    },
  });

  // 변경사항 계산 (역할 기준으로 비교)
  const changes = useMemo(() => {
    const toAllow: number[] = []; // 역할에 없는데 선택됨 → ALLOW
    const toDeny: number[] = []; // 역할에 있는데 선택 해제됨 → DENY
    const toRemove: number[] = []; // 기존 매핑 제거 필요

    // 현재 선택 상태와 역할 비교
    selectedAuthIds.forEach((authId) => {
      if (!roleAuthIds.has(authId)) {
        // 역할에 없는데 선택됨 → ALLOW 필요
        const existingMap = existingMaps.find((m) => m.authId === authId);
        if (!existingMap || existingMap.effect !== 'ALLOW') {
          toAllow.push(authId);
        }
      }
    });

    roleAuthIds.forEach((authId) => {
      if (!selectedAuthIds.has(authId)) {
        // 역할에 있는데 선택 해제됨 → DENY 필요
        const existingMap = existingMaps.find((m) => m.authId === authId);
        if (!existingMap || existingMap.effect !== 'DENY') {
          toDeny.push(authId);
        }
      }
    });

    // 더 이상 필요 없는 기존 매핑 찾기
    existingMaps.forEach((map) => {
      const isRolePermission = roleAuthIds.has(map.authId);
      const isSelected = selectedAuthIds.has(map.authId);

      if (map.effect === 'ALLOW' && (isRolePermission || !isSelected)) {
        // ALLOW였는데 역할에 있거나 선택 해제됨 → 제거
        toRemove.push(map.mapId);
      } else if (map.effect === 'DENY' && (!isRolePermission || isSelected)) {
        // DENY였는데 역할에 없거나 선택됨 → 제거
        toRemove.push(map.mapId);
      }
    });

    const hasChanges = !areSetsEqual(selectedAuthIds, initialSelectedAuthIds);

    return { toAllow, toDeny, toRemove, hasChanges };
  }, [selectedAuthIds, initialSelectedAuthIds, roleAuthIds, existingMaps]);

  // 저장 핸들러
  const handleSave = async () => {
    if (!numericUserId || !changes.hasChanges) return;

    try {
      // 1. 먼저 기존 매핑 삭제
      for (const mapId of changes.toRemove) {
        await new Promise<void>((resolve, reject) => {
          deleteMap(
            { userId: numericUserId, mapId },
            {
              onSuccess: () => resolve(),
              onError: (err: Error) => reject(err),
            },
          );
        });
      }

      // 2. ALLOW 생성
      if (changes.toAllow.length > 0) {
        await new Promise<void>((resolve, reject) => {
          createMap(
            {
              params: { userId: numericUserId },
              data: { authIds: changes.toAllow, effect: 'ALLOW' },
            },
            {
              onSuccess: () => resolve(),
              onError: (err: Error) => reject(err),
            },
          );
        });
      }

      // 3. DENY 생성
      if (changes.toDeny.length > 0) {
        await new Promise<void>((resolve, reject) => {
          createMap(
            {
              params: { userId: numericUserId },
              data: { authIds: changes.toDeny, effect: 'DENY' },
            },
            {
              onSuccess: () => resolve(),
              onError: (err: Error) => reject(err),
            },
          );
        });
      }

      toast.success('개별 권한 설정이 저장되었습니다.');
      refetch();
    } catch {
      // 에러는 개별 mutation에서 처리됨
    }
  };

  // 취소 핸들러 (초기 상태로 복원)
  const handleCancel = () => {
    setSelectedAuthIds(new Set(initialSelectedAuthIds));
  };

  const isLoading = isUserFetching || isRoleFetching || isMapLoading;
  const isSaving = isCreating || isDeleting;

  if (isLoading || !numericUserId) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 사용자 정보 표시 */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">{user?.username}</span> 님의 역할: <span className="font-medium text-blue-600">{role?.roleName ?? '역할 없음'}</span>
        <span className="text-gray-400 ml-2">(역할 권한 {roleAuthIds.size}개)</span>
      </div>

      {/* 권한 선택기 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <UserPermissionSelector roleAuthIds={roleAuthIds} selectedAuthIds={selectedAuthIds} existingMaps={existingMaps} onChange={setSelectedAuthIds} readOnly={isSaving} />
        </div>
      </div>

      {/* 저장/취소 버튼 */}
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-4 pt-4 border-t border-gray-100">
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} loading={isSaving} disabled={!changes.hasChanges}>
            저장
            {changes.hasChanges && (
              <span className="ml-1 text-xs">
                ({changes.toAllow.length > 0 && `+${changes.toAllow.length}`}
                {changes.toDeny.length > 0 && changes.toAllow.length > 0 && ', '}
                {changes.toDeny.length > 0 && `-${changes.toDeny.length}`})
              </span>
            )}
          </Button>
        </Col>
        <Col>
          <Button onClick={handleCancel} disabled={!changes.hasChanges || isSaving}>
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
