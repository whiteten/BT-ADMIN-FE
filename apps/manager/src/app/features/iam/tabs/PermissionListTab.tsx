/**
 * 권한 목록 탭
 */

import { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag, Tooltip, message } from 'antd';
import { Copy, Search } from 'lucide-react';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import type { MenuWithPermissions, PermissionSummary } from '../types/iam.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// 권한 목록용 확장 타입 (appId 포함) - 함수보다 먼저 선언
interface FlatPermission extends PermissionSummary {
  appId: string;
}

/**
 * 메뉴와 모든 하위 메뉴의 권한을 재귀적으로 수집
 */
function collectAllPermissions(menu: MenuWithPermissions, appId: string): FlatPermission[] {
  const perms: FlatPermission[] = (menu.permissions || []).map((p) => ({ ...p, appId }));
  for (const child of menu.children || []) {
    perms.push(...collectAllPermissions(child, appId));
  }
  return perms;
}

// 앱 이름 매핑
const APP_NAME_MAP: Record<string, string> = {
  manager: 'Manager',
  fca: 'FCA',
  BOT: '챗봇 관리',
  IC: '인바운드 콜',
  IR: 'IVR 관리',
  CM: '공통 관리',
};

const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

export default function PermissionListTab() {
  const { gridOptions } = useAggridOptions();
  const [appId, setAppId] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchParams, setSearchParams] = useState<{ appId?: string; keyword?: string }>({});

  // API 연동: 그룹화된 권한 목록 조회
  const { data: permissionGroups = [], isLoading: loading } = useGetGroupedPermissions();

  // 전체 권한 목록 플랫하게 변환 (트리 구조에서 재귀적으로 수집)
  const allPermissions: FlatPermission[] = useMemo(() => {
    return permissionGroups.flatMap((group) => group.menus.flatMap((menu) => collectAllPermissions(menu, menu.appId)));
  }, [permissionGroups]);

  // 클라이언트 필터링
  const permissions = useMemo(() => {
    return allPermissions.filter((p) => {
      // 앱 필터
      if (searchParams.appId && p.appId !== searchParams.appId) return false;
      // 키워드 필터
      if (searchParams.keyword) {
        const lowerKeyword = searchParams.keyword.toLowerCase();
        const matchKey = p.authKey.toLowerCase().includes(lowerKeyword);
        const matchDesc = p.description?.toLowerCase().includes(lowerKeyword);
        if (!matchKey && !matchDesc) return false;
      }
      return true;
    });
  }, [allPermissions, searchParams]);

  const columnDefs: ColDef<FlatPermission>[] = useMemo(
    () => [
      {
        headerName: '앱',
        field: 'appId',
        width: 110,
        cellRenderer: (params: { value: string }) => {
          const appName = APP_NAME_MAP[params.value] || params.value;
          return <Tag color="cyan">{appName}</Tag>;
        },
      },
      { headerName: '도메인', field: 'domain', width: 100, cellRenderer: (params: { value: string }) => <span className="capitalize">{params.value}</span> },
      { headerName: '리소스', field: 'resourceKey', width: 100 },
      {
        headerName: '액션',
        field: 'action',
        width: 90,
        cellRenderer: (params: { value: string }) => <Tag color={actionColorMap[params.value]}>{params.value}</Tag>,
      },
      {
        headerName: '권한 키',
        field: 'authKey',
        flex: 1,
        minWidth: 220,
        cellRenderer: (params: { value: string }) => (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono truncate">{params.value}</code>
            <Tooltip title="복사">
              <button
                className="p-1 hover:bg-gray-200 rounded shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(params.value);
                  message.success('복사됨');
                }}
              >
                <Copy className="size-3 text-gray-500" />
              </button>
            </Tooltip>
          </div>
        ),
      },
      { headerName: '설명', field: 'description', flex: 1, minWidth: 150 },
    ],
    [],
  );

  const handleSearch = () => {
    setSearchParams({
      appId: appId || undefined,
      keyword: keyword || undefined,
    });
  };

  // 앱 옵션 (고정)
  const appOptions = [
    { label: '전체 앱', value: '' },
    { label: 'Manager', value: 'manager' },
    { label: 'FCA', value: 'fca' },
    { label: '챗봇 관리', value: 'BOT' },
    { label: '인바운드 콜', value: 'IC' },
    { label: 'IVR 관리', value: 'IR' },
    { label: '공통 관리', value: 'CM' },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 필터 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Select options={appOptions} value={appId} onChange={setAppId} className="!w-[140px]" />
          <Input placeholder="권한 키 또는 설명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} className="!w-[250px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </div>
        <span className="text-sm text-gray-500">검색결과 {permissions.length}개</span>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<FlatPermission> {...{ rowData: permissions, columnDefs, gridOptions, loading }} />
      </div>
    </div>
  );
}
