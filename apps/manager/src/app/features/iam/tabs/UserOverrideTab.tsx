/**
 * 사용자 권한 할당 탭 (관리자 전체 조회용)
 * - 역할과 무관하게 개별 사용자에게 권한 부여(ALLOW) 또는 차단(DENY) 현황 조회
 * - 사용자 필터링 후 상세 페이지로 이동하여 관리
 *
 * NOTE: V3.0에서 API가 /users/{userId}/auth-maps 구조로 변경됨
 * - 생성/삭제는 사용자 상세 페이지에서만 가능
 * - 이 화면은 조회 전용으로 유지
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Select, Tag } from 'antd';
import { CheckCircle, ExternalLink, Search, Shield, XCircle } from 'lucide-react';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import { useGetUserAuthMaps } from '../hooks/useUserAuthQueries';
import { useGetUsers } from '../hooks/useUserQueries';
import type { UserAuthMap } from '../types/iam.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
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

export default function UserOverrideTab() {
  const { gridOptions } = useAggridOptions();
  const navigate = useNavigate();
  const [searchUserId, setSearchUserId] = useState<number | undefined>();

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
    }),
    [searchUserId],
  );

  // API 연동: 사용자 권한 매핑 목록 조회
  const {
    data: overrides = [],
    isLoading: loading,
    refetch,
  } = useGetUserAuthMaps({
    params: queryParams,
  });

  // 사용자명 매핑 (usersData → Map)
  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();
    usersData.forEach((u) => {
      map.set(u.userId, `${u.userName} (${u.userSabun})`);
    });
    return map;
  }, [usersData]);

  // rowData에 표시용 필드 추가
  const rowData = useMemo(() => {
    return overrides.map((item) => ({
      ...item,
      _displayUserName: userNameMap.get(item.userId) ?? `ID: ${item.userId}`,
      _displayAppName: item.appId ? (appNameMap[item.appId] ?? item.appId) : '-',
    }));
  }, [overrides, userNameMap, appNameMap]);

  // 사용자 상세 페이지로 이동 (개별 권한 탭)
  const handleGoToUserDetail = useCallback(
    (userId: number) => {
      navigate(`/manager/resource/user/${userId}?tab=tab3`);
    },
    [navigate],
  );

  // columnDefs
  const columnDefs: ColDef<UserAuthMap & { _displayUserName: string; _displayAppName: string }>[] = useMemo(
    () => [
      {
        headerName: '사용자',
        field: '_displayUserName',
        width: 150,
        pinned: 'left',
      },
      {
        headerName: '유형',
        field: 'effect',
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
        width: 80,
        pinned: 'right',
        cellRenderer: (params: { data: UserAuthMap; context: { onGoToDetail: (userId: number) => void } }) => (
          <Button type="link" size="small" icon={<ExternalLink className="size-3.5" />} onClick={() => params.context.onGoToDetail(params.data.userId)}>
            관리
          </Button>
        ),
      },
    ],
    [],
  );

  const handleSearch = useCallback(() => {
    refetch();
  }, [refetch]);

  // AgGrid context
  const gridContext = useMemo(() => ({ onGoToDetail: handleGoToUserDetail }), [handleGoToUserDetail]);

  // 통계 계산
  const stats = useMemo(() => {
    return {
      total: overrides.length,
      grants: overrides.filter((r) => r.effect === 'ALLOW').length,
      denies: overrides.filter((r) => r.effect === 'DENY').length,
    };
  }, [overrides]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Shield} iconBg="from-slate-500 to-slate-600" label="전체" value={stats.total} />
        <StatCard icon={CheckCircle} iconBg="from-green-500 to-emerald-600" label="허용" value={stats.grants} valueColor="text-green-600" />
        <StatCard icon={XCircle} iconBg="from-red-500 to-rose-600" label="차단" value={stats.denies} valueColor="text-red-600" />
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
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </div>
        <div className="text-sm text-gray-500">* 권한 부여/차단은 사용자 상세 페이지에서 관리합니다.</div>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact {...{ rowData, columnDefs, gridOptions, loading, context: gridContext }} />
      </div>
    </div>
  );
}
