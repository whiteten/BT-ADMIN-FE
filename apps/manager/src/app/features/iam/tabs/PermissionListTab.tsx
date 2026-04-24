/**
 * 권한 목록 탭
 */

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag, Tooltip } from 'antd';
import { Copy, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetApps } from '../hooks/useAppQueries';
import { permissionQueryKeys, useDeletePermission, useGetAuthList } from '../hooks/usePermissionQueries';
import type { PermissionFlat } from '../types/iam.types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

export default function PermissionListTab() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [appId, setAppId] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchParams, setSearchParams] = useState<{ appId?: string; action?: string; keyword?: string }>({});

  // API 연동: Flat 권한 목록 조회
  const { data: allPermissions = [], isLoading: loading } = useGetAuthList();

  // API 연동: 앱 목록 조회
  const { data: apps = [] } = useGetApps();

  // 권한 삭제 Mutation
  const deletePermissionMutation = useDeletePermission({
    mutationOptions: {
      onSuccess: () => {
        toast.success('권한이 삭제되었습니다');
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getAuthList.queryKey });
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getGroupedPermissions.queryKey });
      },
    },
  });

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

  // 삭제 핸들러
  const handleDelete = (authKey: string) => {
    modal.confirm.delete({
      onOk: () => deletePermissionMutation.mutate(authKey),
    });
  };

  const columnDefs: ColDef<PermissionFlat>[] = useMemo(
    () => [
      {
        headerName: '앱',
        field: 'appId',
        width: 110,
        cellRenderer: (params: { value: string }) => {
          const app = apps.find((a) => a.appId === params.value);
          const appName = app?.appName ?? params.value;
          return <Tag color="cyan">{appName}</Tag>;
        },
      },
      { headerName: '연결된 메뉴', field: 'menuLabel', width: 160 },
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
        headerName: '',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<PermissionFlat>) => {
          const { data } = params;
          if (!data || data.isSystem) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(data.authKey);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [apps, handleDelete],
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
