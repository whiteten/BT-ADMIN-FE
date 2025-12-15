/**
 * 권한 목록 페이지
 * - 시스템에 정의된 모든 권한(Permission)을 조회
 * - 앱/도메인별 필터링 지원
 * - 권한 키(permKey) 복사 기능
 */

import { useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space, Tag, Tooltip, message } from 'antd';
import { Copy, Search } from 'lucide-react';

import { appDummyData, permissionDummyData } from '../../features/iam/data/iam-dummy';
import type { Permission } from '../../features/iam/types/iam.types';

import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// 액션별 색상 매핑
const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

// AG Grid 컬럼 정의
const columnDefs: ColDef<Permission>[] = [
  {
    headerName: '앱',
    field: 'appId',
    width: 100,
    cellRenderer: (params: { value: string }) => {
      const app = appDummyData.find((a) => a.appId === params.value);
      return (
        <Tag color="cyan" className="font-medium">
          {app?.appName || params.value}
        </Tag>
      );
    },
  },
  {
    headerName: '도메인',
    field: 'domain',
    width: 120,
    cellRenderer: (params: { value: string }) => <span className="capitalize font-medium">{params.value}</span>,
  },
  {
    headerName: '리소스',
    field: 'resource',
    width: 120,
  },
  {
    headerName: '액션',
    field: 'action',
    width: 100,
    cellRenderer: (params: { value: string }) => <Tag color={actionColorMap[params.value] || 'default'}>{params.value}</Tag>,
  },
  {
    headerName: '권한 키',
    field: 'permKey',
    flex: 1,
    minWidth: 250,
    cellRenderer: (params: { value: string }) => (
      <div className="flex items-center gap-2">
        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{params.value}</code>
        <Tooltip title="복사">
          <button
            className="p-1 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(params.value);
              message.success('권한 키가 복사되었습니다.');
            }}
          >
            <Copy className="size-3.5 text-gray-500" />
          </button>
        </Tooltip>
      </div>
    ),
  },
  {
    headerName: '설명',
    field: 'description',
    flex: 1,
    minWidth: 150,
  },
  {
    headerName: '사용여부',
    field: 'useYn',
    width: 100,
    cellRenderer: (params: { value: string }) => <Tag color={params.value === 'Y' ? 'green' : 'default'}>{params.value === 'Y' ? '사용' : '미사용'}</Tag>,
  },
];

// 앱 옵션
const appOptions = [{ label: '전체', value: '' }, ...appDummyData.map((app) => ({ label: app.appName, value: app.appId }))];

// 도메인 옵션 (동적으로 추출)
const uniqueDomains = [...new Set(permissionDummyData.map((p) => p.domain))];
const domainOptions = [{ label: '전체', value: '' }, ...uniqueDomains.map((domain) => ({ label: domain, value: domain }))];

export default function PermissionList() {
  const { gridOptions } = useAggridOptions();

  const [rowData, setRowData] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  // 필터 상태
  const [appId, setAppId] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  // 검색 실행
  const handleSearch = () => {
    setRowData([]);
    setLoading(true);

    setTimeout(() => {
      let filtered = permissionDummyData;

      // 앱 필터
      if (appId) {
        filtered = filtered.filter((p) => p.appId === appId);
      }

      // 도메인 필터
      if (domain) {
        filtered = filtered.filter((p) => p.domain === domain);
      }

      // 키워드 검색
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filtered = filtered.filter((p) => p.permKey.toLowerCase().includes(lowerKeyword) || p.description?.toLowerCase().includes(lowerKeyword));
      }

      setRowData(filtered);
      setLoading(false);
    }, 300);
  };

  // 필터 초기화
  const handleReset = () => {
    setAppId('');
    setDomain('');
    setKeyword('');
    setRowData([]);
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* 헤더 영역 - 필터 */}
      <header className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between">
        <div className="flex flex-wrap gap-2 w-full">
          <Space.Compact>
            <Select placeholder="앱 선택" options={appOptions} value={appId} onChange={setAppId} className="!w-[120px]" allowClear />
            <Select placeholder="도메인 선택" options={domainOptions} value={domain} onChange={setDomain} className="!w-[140px]" allowClear />
            <Input
              className="!w-[200px] lg:!w-[250px]"
              placeholder="권한 키 또는 설명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" onClick={handleSearch} icon={<Search className="size-4" />}>
              검색
            </Button>
          </Space.Compact>
          <Button onClick={handleReset}>초기화</Button>
        </div>

        {/* 권한 수 표시 */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>
            전체 <strong className="text-blue-600">{permissionDummyData.length}</strong>개
          </span>
          {rowData.length > 0 && (
            <span>
              / 검색결과 <strong className="text-green-600">{rowData.length}</strong>개
            </span>
          )}
        </div>
      </header>

      {/* 본문 영역 - 그리드 */}
      <div className="max-lg:hidden w-full h-full">
        <AgGridReact<Permission> {...{ rowData, columnDefs, gridOptions, loading }} />
      </div>

      {/* 본문 영역 - 카드 뷰 (모바일) */}
      <div className="lg:hidden w-full h-full overflow-y-auto">
        {loading ? (
          <FallbackSpinner />
        ) : rowData.length > 0 ? (
          <div className="space-y-2">
            {rowData.map((perm) => (
              <div key={perm.authId} className="bg-white rounded-lg p-3 shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <Tag color="cyan">{appDummyData.find((a) => a.appId === perm.appId)?.appName}</Tag>
                  <Tag color={actionColorMap[perm.action] || 'default'}>{perm.action}</Tag>
                </div>
                <div className="font-medium mb-1">{perm.description}</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono flex-1 truncate">{perm.permKey}</code>
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    onClick={() => {
                      navigator.clipboard.writeText(perm.permKey);
                      message.success('복사됨');
                    }}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <NoData message="검색 버튼을 클릭하여 권한 목록을 조회하세요." />
        )}
      </div>
    </div>
  );
}
