/**
 * 권한 목록 탭
 */

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, Modal, Select, Tag, Tooltip } from 'antd';
import { Copy, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetApps } from '../hooks/useAppQueries';
import { permissionQueryKeys, useCreatePermission, useDeletePermission, useGetAuthList } from '../hooks/usePermissionQueries';
import type { PermissionCreateRequest, PermissionFlat } from '../types/iam.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

export default function PermissionListTab() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const [appId, setAppId] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchParams, setSearchParams] = useState<{ appId?: string; domain?: string; action?: string; keyword?: string }>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form] = Form.useForm<PermissionCreateRequest>();

  // API 연동: Flat 권한 목록 조회
  const { data: allPermissions = [], isLoading: loading } = useGetAuthList();

  // API 연동: 앱 목록 조회
  const { data: apps = [] } = useGetApps();

  // 권한 생성 Mutation
  const createPermissionMutation = useCreatePermission({
    mutationOptions: {
      onSuccess: () => {
        toast.success('권한이 생성되었습니다');
        setIsCreateModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getAuthList.queryKey });
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getGroupedPermissions.queryKey });
      },
      onError: () => {
        toast.error('권한 생성에 실패했습니다');
      },
    },
  });

  // 권한 삭제 Mutation
  const deletePermissionMutation = useDeletePermission({
    mutationOptions: {
      onSuccess: () => {
        toast.success('권한이 삭제되었습니다');
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getAuthList.queryKey });
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getGroupedPermissions.queryKey });
      },
      onError: () => {
        toast.error('권한 삭제에 실패했습니다');
      },
    },
  });

  // 동적 필터 옵션 생성 (앱: API, 도메인/액션: 그리드 데이터에서 추출)
  const filterOptions = useMemo(() => {
    const domains = [...new Set(allPermissions.map((p) => p.domain))].sort();
    const actions = [...new Set(allPermissions.map((p) => p.action))].sort();
    return {
      apps: [{ label: '전체 앱', value: '' }, ...apps.map((a) => ({ label: a.appName, value: a.appId }))],
      domains: [{ label: '전체 도메인', value: '' }, ...domains.map((d) => ({ label: d, value: d }))],
      actions: [{ label: '전체 액션', value: '' }, ...actions.map((a) => ({ label: a, value: a }))],
    };
  }, [apps, allPermissions]);

  // 클라이언트 필터링
  const permissions = useMemo(() => {
    return allPermissions.filter((p) => {
      // 앱 필터
      if (searchParams.appId && p.appId !== searchParams.appId) return false;
      // 도메인 필터
      if (searchParams.domain && p.domain !== searchParams.domain) return false;
      // 액션 필터
      if (searchParams.action && p.action !== searchParams.action) return false;
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

  // 삭제 핸들러
  const handleDelete = (authId: number) => {
    Modal.confirm({
      title: '권한 삭제',
      content: '이 권한을 삭제하시겠습니까?',
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => deletePermissionMutation.mutate(authId),
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
      { headerName: '연결된 메뉴', field: 'menuLabel', width: 150 },
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
                handleDelete(data.authId);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:text-red-700 hover:cursor-pointer" />
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
      domain: domain || undefined,
      action: action || undefined,
      keyword: keyword || undefined,
    });
  };

  const handleCreatePermission = async () => {
    try {
      const values = await form.validateFields();
      createPermissionMutation.mutate(values);
    } catch {
      // Form validation error
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 필터 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Select options={filterOptions.apps} value={appId} onChange={setAppId} className="!w-[140px]" />
          <Select options={filterOptions.domains} value={domain} onChange={setDomain} className="!w-[140px]" />
          <Select options={filterOptions.actions} value={action} onChange={setAction} className="!w-[140px]" />
          <Input placeholder="권한 키 또는 설명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} className="!w-[250px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">검색결과 {permissions.length}개</span>
          <Button type="primary" icon={<Plus className="size-4" />} onClick={() => setIsCreateModalOpen(true)}>
            권한 추가
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<PermissionFlat> {...{ rowData: permissions, columnDefs, gridOptions, loading }} />
      </div>

      {/* 권한 추가 모달 */}
      <Modal
        title="권한 추가"
        open={isCreateModalOpen}
        onOk={handleCreatePermission}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        okText="생성"
        cancelText="취소"
        confirmLoading={createPermissionMutation.isPending}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
            <Select placeholder="앱 선택" options={filterOptions.apps.filter((opt) => opt.value !== '')} />
          </Form.Item>

          <Form.Item label="도메인" name="domain" rules={[{ required: true, message: '도메인을 입력해주세요' }]}>
            <Input placeholder="예: menu, user, role" />
          </Form.Item>

          <Form.Item label="리소스" name="resourceKey" rules={[{ required: true, message: '리소스를 입력해주세요' }]}>
            <Input placeholder="예: list, detail, settings" />
          </Form.Item>

          <Form.Item label="액션" name="action" rules={[{ required: true, message: '액션을 선택해주세요' }]}>
            <Select
              placeholder="액션 선택"
              options={[
                { label: 'read', value: 'read' },
                { label: 'write', value: 'write' },
                { label: 'delete', value: 'delete' },
                { label: 'execute', value: 'execute' },
              ]}
            />
          </Form.Item>

          <Form.Item label="설명" name="description">
            <Input.TextArea placeholder="권한에 대한 설명을 입력해주세요" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
