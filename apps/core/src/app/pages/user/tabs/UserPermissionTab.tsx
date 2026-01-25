/**
 * 사용자 상세 - 개별 권한 탭
 * - 역할과 무관하게 해당 사용자에게 개별적으로 권한 부여(ALLOW) 또는 차단(DENY)
 * - 다중 권한 선택 가능 (Checkbox 트리)
 */

import { useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Modal, Tag } from 'antd';
import { CheckCircle, Plus, Trash2, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import UserAuthMapModal, { type UserAuthMapModalRef } from '../../../features/iam/components/UserAuthMapModal';
import { useGetGroupedPermissions } from '../../../features/iam/hooks/usePermissionQueries';
import { useDeleteUserAuthMapMutation, useGetUserAuthMaps } from '../../../features/iam/hooks/useUserAuthQueries';
import type { UserAuthMap } from '../../../features/iam/types/iam.types';
import { useGetUser } from '../../../features/user/hooks/useUserQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export default function UserPermissionTab() {
  const { userId } = useParams();
  const numericUserId = userId ? Number(userId) : undefined;

  const { gridOptions } = useAggridOptions();
  const modalRef = useRef<UserAuthMapModalRef>(null);

  // 사용자 조회 (정보 표시용)
  const { data: user, isFetching: isUserFetching } = useGetUser({
    id: numericUserId,
  });

  // 권한 그룹 조회 (앱 이름 매핑용)
  const { data: permissionGroups = [] } = useGetGroupedPermissions();

  // 앱 이름 매핑
  const appNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    permissionGroups.forEach((group) => {
      map[group.appId] = group.appName;
    });
    return map;
  }, [permissionGroups]);

  // 쿼리 파라미터 (해당 사용자만 조회)
  const queryParams = useMemo(
    () => ({
      userId: numericUserId,
    }),
    [numericUserId],
  );

  // 사용자 권한 매핑 목록 조회
  const {
    data: overrides = [],
    isLoading: loading,
    refetch,
  } = useGetUserAuthMaps({
    params: queryParams,
  });

  // 삭제 Mutation - userId 필수
  const { mutate: deleteMap } = useDeleteUserAuthMapMutation(numericUserId ?? 0, {
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '삭제에 실패했습니다.';
        toast.error(errorMessage);
      },
    },
  });

  // rowData에 표시용 필드 추가
  const rowData = useMemo(() => {
    return overrides.map((item) => ({
      ...item,
      _displayAppName: item.appId ? (appNameMap[item.appId] ?? item.appId) : '-',
    }));
  }, [overrides, appNameMap]);

  // columnDefs
  const columnDefs: ColDef<UserAuthMap & { _displayAppName: string }>[] = useMemo(
    () => [
      {
        headerName: '유형',
        field: 'mapType',
        width: 100,
        cellRenderer: (params: { value: string }) => {
          const isAllow = params.value === 'ALLOW';
          return (
            <span className={cn('flex items-center gap-1', isAllow ? 'text-green-600' : 'text-red-600')}>
              {isAllow ? <CheckCircle className="size-3.5" /> : <XCircle className="size-3.5" />}
              {isAllow ? '허용' : '차단'}
            </span>
          );
        },
      },
      {
        headerName: '앱',
        field: '_displayAppName',
        width: 100,
        cellRenderer: (params: { value: string }) => <Tag color="cyan">{params.value}</Tag>,
      },
      { headerName: '권한', field: 'authDescription', flex: 1, minWidth: 150 },
      {
        headerName: '권한 키',
        field: 'authKey',
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: { value: string }) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{params.value}</code>,
      },
      { headerName: '등록자', field: 'createdBy', width: 100 },
      {
        headerName: '',
        width: 60,
        pinned: 'right',
        cellRenderer: (params: { data: UserAuthMap; context: { onDelete: (item: UserAuthMap) => void } }) => (
          <Button type="text" danger size="small" icon={<Trash2 className="size-3.5" />} onClick={() => params.context.onDelete(params.data)} />
        ),
      },
    ],
    [],
  );

  const handleAdd = () => {
    modalRef.current?.open();
  };

  const handleDelete = useCallback(
    (item: UserAuthMap) => {
      Modal.confirm({
        title: '권한 설정 삭제',
        content: `"${item.authDescription}" 권한 설정을 삭제하시겠습니까?`,
        okText: '삭제',
        okType: 'danger',
        cancelText: '취소',
        onOk: () => deleteMap(item.mapId),
      });
    },
    [deleteMap],
  );

  const gridContext = useMemo(() => ({ onDelete: handleDelete }), [handleDelete]);

  if (isUserFetching || !numericUserId) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 추가 버튼 */}
      <div className="flex items-center justify-end gap-2">
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleAdd}>
          권한 부여/차단
        </Button>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact {...{ rowData, columnDefs, gridOptions, loading, context: gridContext }} />
      </div>

      {/* 권한 부여/차단 모달 */}
      <UserAuthMapModal ref={modalRef} userId={numericUserId} onSuccess={refetch} />
    </div>
  );
}
