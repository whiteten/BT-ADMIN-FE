/**
 * 권한 목록 탭
 */

import { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag, Tooltip, message } from 'antd';
import { Copy, Search } from 'lucide-react';
import { useGetPermissions } from '../hooks/usePermissionQueries';
import type { Permission } from '../types/iam.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// 앱 이름 매핑 (백엔드 PermissionService와 동일)
const APP_NAME_MAP: Record<string, string> = {
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

  // 쿼리 파라미터 메모이제이션 (무한 refetch 방지)
  const queryParams = useMemo(
    () => ({
      appId: searchParams.appId,
      keyword: searchParams.keyword,
    }),
    [searchParams.appId, searchParams.keyword],
  );

  // API 연동: 권한 목록 조회
  const { data: permissions = [], isLoading: loading } = useGetPermissions({ params: queryParams });

  const columnDefs: ColDef<Permission>[] = useMemo(
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
      { headerName: '리소스', field: 'resource', width: 100 },
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
        <AgGridReact<Permission> {...{ rowData: permissions, columnDefs, gridOptions, loading }} />
      </div>
    </div>
  );
}
