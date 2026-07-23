/**
 * 권한 목록 탭 (읽기 전용 참조 뷰)
 * - 시스템에 등록된 전체 권한 현황을 조회
 * - 역할/사용자 할당 수를 표시하여 권한 사용 현황 파악
 */

import { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tooltip } from 'antd';
import { Copy, Search, Shield, User } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { copyToClipboard, toast } from '@/shared-util';
import { useGetApps } from '../hooks/useAppQueries';
import { useGetAuthList } from '../hooks/usePermissionQueries';
import type { PermissionFlat } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';
const actionBadgeClassMap: Record<string, string> = {
  read: 'text-blue-600 bg-blue-50',
  write: 'text-emerald-600 bg-emerald-50',
  delete: 'text-red-500 bg-red-50',
  apply: 'text-purple-600 bg-purple-50',
  export: 'text-slate-600 bg-slate-100',
};

export default function PermissionListTab() {
  const { gridOptions } = useAggridOptions();
  const [appId, setAppId] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchParams, setSearchParams] = useState<{ appId?: string; action?: string; keyword?: string }>({});

  const { data: allPermissions = [], isLoading: loading } = useGetAuthList();
  const { data: apps = [] } = useGetApps();

  // 동적 필터 옵션 생성
  const filterOptions = useMemo(() => {
    const actions = [...new Set(allPermissions.map((p) => p.action))].sort();
    return {
      apps: [{ label: '전체 앱', value: '' }, ...apps.map((a) => ({ label: a.appName, value: a.appId }))],
      actions: [{ label: '전체 액션', value: '' }, ...actions.map((a) => ({ label: a, value: a }))],
    };
  }, [apps, allPermissions]);

  // 클라이언트 필터링
  const permissions = useMemo(() => {
    return allPermissions.filter((p) => {
      if (searchParams.appId && p.appId !== searchParams.appId) return false;
      if (searchParams.action && p.action !== searchParams.action) return false;
      if (searchParams.keyword) {
        const lowerKeyword = searchParams.keyword.toLowerCase();
        const matchKey = p.authKey.toLowerCase().includes(lowerKeyword);
        const matchDesc = p.description?.toLowerCase().includes(lowerKeyword);
        if (!matchKey && !matchDesc) return false;
      }
      return true;
    });
  }, [allPermissions, searchParams]);

  const columnDefs: ColDef<PermissionFlat>[] = useMemo(
    () => [
      {
        headerName: '앱',
        field: 'appId',
        width: 110,
        filterValueGetter: (params) => {
          const app = apps.find((a) => a.appId === params.data?.appId);
          return app?.appName ?? params.data?.appId ?? '';
        },
        cellRenderer: (params: { value: string }) => {
          const app = apps.find((a) => a.appId === params.value);
          const appName = app?.appName ?? params.value;
          return (
            <Badge variant="secondary" className={cn(BADGE_CLASS, 'text-cyan-600 bg-cyan-50')}>
              {appName}
            </Badge>
          );
        },
      },
      { headerName: '연결된 메뉴', field: 'menuLabel', width: 160 },
      {
        headerName: '액션',
        field: 'action',
        width: 90,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: { value: string }) => (
          <Badge variant="secondary" className={cn(BADGE_CLASS, actionBadgeClassMap[params.value] ?? 'text-gray-500 bg-gray-100')}>
            {params.value}
          </Badge>
        ),
      },
      {
        headerName: '권한 키',
        field: 'authKey',
        flex: 1,
        minWidth: 220,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: { value: string }) => (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono truncate">{params.value}</code>
            <Tooltip title="복사">
              <button
                className="p-1 hover:bg-gray-200 rounded shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(params.value);
                  toast.success('복사됨');
                }}
              >
                <Copy className="size-3 text-gray-500" />
              </button>
            </Tooltip>
          </div>
        ),
      },
      { headerName: '설명', field: 'description', flex: 1, minWidth: 150 },
      {
        headerName: '역할',
        field: 'roleCount',
        width: 80,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: { value: number }) => (
          <Tooltip title={`${params.value}개 역할에 할당됨`}>
            <div className="flex items-center gap-1 text-sm">
              <Shield className="size-3.5 text-blue-500" />
              <span className="font-medium text-gray-700">{params.value}</span>
            </div>
          </Tooltip>
        ),
      },
      {
        headerName: '사용자',
        field: 'userOverrideCount',
        width: 80,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: { value: number }) => (
          <Tooltip title={`${params.value}명 사용자에게 개별 할당됨`}>
            <div className="flex items-center gap-1 text-sm">
              <User className="size-3.5 text-violet-500" />
              <span className="font-medium text-gray-700">{params.value}</span>
            </div>
          </Tooltip>
        ),
      },
    ],
    [apps],
  );

  const handleSearch = () => {
    setSearchParams({
      appId: appId || undefined,
      action: action || undefined,
      keyword: keyword || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 필터 */}
      <div className="flex gap-2 items-center">
        <Select options={filterOptions.apps} value={appId} onChange={setAppId} className="!w-[140px]" />
        <Select options={filterOptions.actions} value={action} onChange={setAction} className="!w-[140px]" />
        <Input placeholder="권한 키 또는 설명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} className="!w-[250px]" />
        <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
          검색
        </Button>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<PermissionFlat> {...{ rowData: permissions, columnDefs, gridOptions, loading }} />
      </div>
    </div>
  );
}
