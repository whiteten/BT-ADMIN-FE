/**
 * 사용자 권한 할당 탭
 * - 역할과 무관하게 개별 사용자에게 권한 부여(ALLOW) 또는 박탈(DENY)
 * - 다중 사용자 선택 가능
 * - 다중 권한 선택 가능 (Checkbox 트리)
 * - 만료일 지정 가능 (임시 권한)
 * - 사유 기록 필수
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Modal, Select, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Calendar, CheckCircle, Clock, Plus, Search, Shield, Trash2, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import UserAuthMapModal, { type UserAuthMapModalRef } from '../components/UserAuthMapModal';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import { useDeleteUserAuthMapMutation, useGetUserAuthMaps } from '../hooks/useUserAuthQueries';
import { useGetUsers } from '../hooks/useUserQueries';
import type { UserAuthMap, UserAuthStatus } from '../types/iam.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { cn } from '@/libs/shared-ui/src/lib/utils';

// 권한 상태 계산 (백엔드에서 status 필드를 제공하지만, 클라이언트에서도 계산 가능)
function getAuthStatus(item: UserAuthMap): UserAuthStatus {
  // 백엔드에서 status를 제공하면 그것을 사용
  if (item.status) return item.status;

  // 아니면 클라이언트에서 계산
  const now = dayjs();
  const from = item.startDate ? dayjs(item.startDate) : null;
  const to = item.endDate ? dayjs(item.endDate) : null;

  if (to && now.isAfter(to)) return 'EXPIRED';
  if (from && now.isBefore(from)) return 'SCHEDULED';
  return 'ACTIVE';
}

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

export default function UserOverrideTab() {
  const { gridOptions } = useAggridOptions();
  const [searchUserId, setSearchUserId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 모달 ref
  const modalRef = useRef<UserAuthMapModalRef>(null);

  // API 연동: 사용자 목록 조회 (Select 옵션용)
  const { data: usersData = [] } = useGetUsers();

  // API 연동: 권한 그룹 조회 (앱 이름 매핑용)
  const { data: permissionGroups = [] } = useGetGroupedPermissions();

  // 앱 이름 매핑
  const appNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    permissionGroups.forEach((group) => {
      map[group.appId] = group.appName;
    });
    return map;
  }, [permissionGroups]);

  // 사용자 옵션 (Select용)
  const userOptions = useMemo(
    () =>
      usersData.map((u) => ({
        label: `${u.userName} (${u.userSabun})`,
        value: u.userId,
      })),
    [usersData],
  );

  // 쿼리 파라미터 메모이제이션 (무한 refetch 방지)
  const queryParams = useMemo(
    () => ({
      userId: searchUserId,
      status: (statusFilter || undefined) as UserAuthStatus | undefined,
    }),
    [searchUserId, statusFilter],
  );

  // API 연동: 사용자 권한 매핑 목록 조회
  const {
    data: overrides = [],
    isLoading: loading,
    refetch,
  } = useGetUserAuthMaps({
    params: queryParams,
  });

  // API 연동: 삭제 Mutation
  const { mutate: deleteMap } = useDeleteUserAuthMapMutation({
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

  const columnDefs: ColDef<UserAuthMap>[] = useMemo(
    () => [
      {
        headerName: '사용자',
        field: 'username',
        width: 150,
        pinned: 'left',
        cellRenderer: (params: { data: UserAuthMap }) => {
          const user = usersData.find((u) => u.userId === params.data.userId);
          return user ? `${user.userName} (${user.userSabun})` : `ID: ${params.data.userId}`;
        },
      },
      {
        headerName: '상태',
        field: 'status',
        width: 80,
        cellRenderer: (params: { data: UserAuthMap }) => {
          const status = getAuthStatus(params.data);
          if (status === 'EXPIRED') return <Tag color="default">만료</Tag>;
          if (status === 'SCHEDULED') return <Tag color="blue">예정</Tag>;
          return params.data.mapType === 'ALLOW' ? <Tag color="green">허용</Tag> : <Tag color="red">차단</Tag>;
        },
      },
      {
        headerName: '유형',
        field: 'mapType',
        width: 90,
        cellRenderer: (params: { value: string; data: UserAuthMap }) => {
          const status = getAuthStatus(params.data);
          const isAllow = params.value === 'ALLOW';
          if (status === 'EXPIRED') return <span className="text-gray-400">{isAllow ? '허용' : '차단'}</span>;
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
        field: 'appId',
        width: 100,
        cellRenderer: (params: { value: string }) => <Tag color="cyan">{appNameMap[params.value] || params.value}</Tag>,
      },
      { headerName: '권한', field: 'authDescription', flex: 1, minWidth: 150 },
      {
        headerName: '권한 키',
        field: 'authKey',
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: { value: string }) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{params.value}</code>,
      },
      {
        headerName: '적용 기간',
        field: 'startDate',
        width: 200,
        cellRenderer: (params: { data: UserAuthMap }) => {
          const from = params.data.startDate;
          const to = params.data.endDate;
          const status = getAuthStatus(params.data);

          if (!from && !to) return <span className="text-gray-400">무기한</span>;

          const fromStr = from ? dayjs(from).format('YYYY-MM-DD') : '즉시';
          const toStr = to ? dayjs(to).format('YYYY-MM-DD') : '무기한';

          return (
            <span className={cn(status === 'EXPIRED' && 'text-gray-400 line-through', status === 'SCHEDULED' && 'text-blue-600')}>
              {fromStr} ~ {toStr}
            </span>
          );
        },
      },
      {
        headerName: '사유',
        field: 'description',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: { value: string }) => (
          <Tooltip title={params.value}>
            <span className="truncate">{params.value || '-'}</span>
          </Tooltip>
        ),
      },
      { headerName: '등록자', field: 'createdBy', width: 100 },
      {
        headerName: '',
        width: 60,
        pinned: 'right',
        cellRenderer: (params: { data: UserAuthMap }) => (
          <Button type="text" danger size="small" icon={<Trash2 className="size-3.5" />} onClick={() => handleDelete(params.data)} />
        ),
      },
    ],
    [usersData, appNameMap],
  );

  const handleSearch = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleAdd = () => {
    modalRef.current?.open();
  };

  const handleDelete = (item: UserAuthMap) => {
    const user = usersData.find((u) => u.userId === item.userId);
    const userName = user ? `${user.userName} (${user.userSabun})` : `ID: ${item.userId}`;

    Modal.confirm({
      title: '권한 설정 삭제',
      content: `사용자 [${userName}]의 "${item.authDescription}" 설정을 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => deleteMap(item.mapId),
    });
  };

  // 통계 계산
  const stats = useMemo(() => {
    return {
      total: overrides.length,
      grants: overrides.filter((r) => r.mapType === 'ALLOW' && getAuthStatus(r) === 'ACTIVE').length,
      denies: overrides.filter((r) => r.mapType === 'DENY' && getAuthStatus(r) === 'ACTIVE').length,
      scheduled: overrides.filter((r) => getAuthStatus(r) === 'SCHEDULED').length,
      expired: overrides.filter((r) => getAuthStatus(r) === 'EXPIRED').length,
    };
  }, [overrides]);

  const statusOptions = [
    { label: '전체 상태', value: '' },
    { label: '유효', value: 'ACTIVE' },
    { label: '예정', value: 'SCHEDULED' },
    { label: '만료', value: 'EXPIRED' },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 통계 카드 */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon={Shield} iconBg="from-slate-500 to-slate-600" label="전체" value={stats.total} />
        <StatCard icon={CheckCircle} iconBg="from-green-500 to-emerald-600" label="허용" value={stats.grants} valueColor="text-green-600" />
        <StatCard icon={XCircle} iconBg="from-red-500 to-rose-600" label="차단" value={stats.denies} valueColor="text-red-600" />
        <StatCard icon={Clock} iconBg="from-blue-500 to-indigo-600" label="예정" value={stats.scheduled} valueColor="text-blue-600" />
        <StatCard icon={Calendar} iconBg="from-gray-400 to-gray-500" label="만료" value={stats.expired} valueColor="text-gray-500" />
      </div>

      {/* 필터 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Select
            showSearch
            allowClear
            placeholder="사용자 선택"
            options={userOptions}
            value={searchUserId}
            onChange={(v) => setSearchUserId(v)}
            className="!w-[220px]"
            filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
          />
          <Select options={statusOptions} value={statusFilter} onChange={setStatusFilter} className="!w-[120px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </div>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleAdd}>
          권한 부여/차단
        </Button>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<UserAuthMap> {...{ rowData: overrides, columnDefs, gridOptions, loading }} />
      </div>

      {/* 권한 부여/박탈 모달 (다중 선택) */}
      <UserAuthMapModal ref={modalRef} userOptions={userOptions} onSuccess={refetch} />
    </div>
  );
}
