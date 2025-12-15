/**
 * 권한 그룹 관리 통합 페이지
 * - 역할 관리, 권한 목록, 사용자 권한 할당을 탭으로 통합
 * - 직관적인 UI/UX로 권한 관리 업무를 한 화면에서 처리
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Form, Input, Modal, Radio, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle, Copy, Plus, Search, Shield, Trash2, Users, XCircle } from 'lucide-react';
import { RoleCard } from '../../features/iam/components/RoleCard';
import { appDummyData, permissionDummyData, roleDummyData, userAuthDummyData, userRoleDummyData } from '../../features/iam/data/iam-dummy';
import type { Permission, Role, UserAuth } from '../../features/iam/types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const { Text } = Typography;

// ============================================================================
// 상수 및 스타일
// ============================================================================

const styles = {
  tabTrigger: 'flex items-center gap-1 px-3 py-2 hover:cursor-pointer border-2 border-transparent data-[state=active]:border-blue-600 whitespace-nowrap',
};

const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

// 사용자 옵션
const userOptions = [...new Set(userRoleDummyData.map((u) => u.userId))].map((userId) => ({
  label: userId,
  value: userId,
}));

// 권한 옵션
const permissionOptions = permissionDummyData.map((p) => ({
  label: `[${p.appId}] ${p.description}`,
  value: p.authId,
  permKey: p.permKey,
  description: p.description,
}));

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AuthGroupManagement() {
  const [activeTab, setActiveTab] = useState('roles');

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col gap-4">
        <TabsList className="flex flex-wrap w-fit bg-white">
          <TabsTrigger value="roles" className={cn(styles.tabTrigger)}>
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm">역할 관리</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className={cn(styles.tabTrigger)}>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">권한 목록</span>
          </TabsTrigger>
          <TabsTrigger value="user-override" className={cn(styles.tabTrigger)}>
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-sm">사용자 권한 할당</span>
          </TabsTrigger>
        </TabsList>

        {/* 탭 콘텐츠 */}
        <TabsContent value="roles" className="flex-1 mt-0 overflow-auto">
          <RoleManagementTab />
        </TabsContent>
        <TabsContent value="permissions" className="flex-1 mt-0 overflow-auto">
          <PermissionListTab />
        </TabsContent>
        <TabsContent value="user-override" className="flex-1 mt-0 overflow-auto">
          <UserOverrideTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// 역할 관리 탭
// ============================================================================

function RoleManagementTab() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const handleSearch = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const filtered = keyword ? roleDummyData.filter((r) => r.roleName.includes(keyword) || r.roleCode.includes(keyword.toUpperCase())) : roleDummyData;
      setRoles(filtered);
      setLoading(false);
    }, 300);
  }, [keyword]);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleCreate = () => {
    navigate('../role/create');
  };

  const handleEdit = (role: Role) => {
    navigate(`../role/${role.roleId}`);
  };

  const handleDelete = (role: Role) => {
    Modal.confirm({
      title: '역할 삭제',
      content: `"${role.roleName}" 역할을 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        message.success('역할이 삭제되었습니다.');
        handleSearch();
      },
    });
  };

  // 통계 계산
  const stats = {
    total: roles.length,
    active: roles.filter((r) => r.useYn === 'Y').length,
    totalPermissions: roles.reduce((sum, r) => sum + (r.permissionCount || 0), 0),
    totalUsers: roles.reduce((sum, r) => sum + (r.userCount || 0), 0),
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">전체 역할</div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
            <CheckCircle className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">활성 역할</div>
            <div className="text-xl font-bold text-green-600">{stats.active}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">총 권한 수</div>
            <div className="text-xl font-bold text-purple-600">{stats.totalPermissions}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-gray-500">총 사용자</div>
            <div className="text-xl font-bold text-orange-600">{stats.totalUsers}</div>
          </div>
        </div>
      </div>

      {/* 검색 및 추가 */}
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <Space.Compact>
          <Input placeholder="역할명 또는 코드 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} className="!w-[200px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </Space.Compact>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
          역할 추가
        </Button>
      </div>

      {/* 카드 그리드 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <FallbackSpinner />
        ) : roles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roles.map((role) => (
              <RoleCard key={role.roleId} role={role} onEdit={() => handleEdit(role)} onDelete={() => handleDelete(role)} />
            ))}
          </div>
        ) : (
          <NoData message="검색 결과가 없습니다." />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 권한 목록 탭
// ============================================================================

function PermissionListTab() {
  const { gridOptions } = useAggridOptions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [appId, setAppId] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  const columnDefs: ColDef<Permission>[] = [
    {
      headerName: '앱',
      field: 'appId',
      width: 100,
      cellRenderer: (params: { value: string }) => {
        const app = appDummyData.find((a) => a.appId === params.value);
        return <Tag color="cyan">{app?.appName || params.value}</Tag>;
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
      field: 'permKey',
      flex: 1,
      minWidth: 200,
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
  ];

  const handleSearch = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      let filtered = permissionDummyData;
      if (appId) filtered = filtered.filter((p) => p.appId === appId);
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter((p) => p.permKey.toLowerCase().includes(kw) || p.description?.toLowerCase().includes(kw));
      }
      setPermissions(filtered);
      setLoading(false);
    }, 300);
  }, [appId, keyword]);

  useEffect(() => {
    handleSearch();
  }, []);

  const appOptions = [{ label: '전체', value: '' }, ...appDummyData.map((a) => ({ label: a.appName, value: a.appId }))];

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 필터 */}
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <Space.Compact>
          <Select options={appOptions} value={appId} onChange={setAppId} className="!w-[120px]" placeholder="앱" />
          <Input placeholder="권한 키 또는 설명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} className="!w-[200px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </Space.Compact>
        <Text type="secondary">
          전체 {permissionDummyData.length}개 / 검색결과 {permissions.length}개
        </Text>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<Permission> {...{ rowData: permissions, columnDefs, gridOptions, loading }} />
      </div>
    </div>
  );
}

// ============================================================================
// 사용자 권한 할당 탭
// ============================================================================

function UserOverrideTab() {
  const { gridOptions } = useAggridOptions();
  const [overrides, setOverrides] = useState<UserAuth[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState<string>('');

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columnDefs: ColDef<UserAuth>[] = [
    { headerName: '사용자ID', field: 'userId', width: 120, pinned: 'left' },
    {
      headerName: '유형',
      field: 'grantType',
      width: 90,
      cellRenderer: (params: { value: string }) => (
        <Tag color={params.value === 'GRANT' ? 'green' : 'red'} className="flex items-center gap-1 w-fit">
          {params.value === 'GRANT' ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
          {params.value === 'GRANT' ? '부여' : '박탈'}
        </Tag>
      ),
    },
    {
      headerName: '앱',
      field: 'appId',
      width: 90,
      cellRenderer: (params: { value: string }) => <Tag color="cyan">{appDummyData.find((a) => a.appId === params.value)?.appName}</Tag>,
    },
    { headerName: '권한', field: 'permDescription', flex: 1, minWidth: 150 },
    {
      headerName: '만료일',
      field: 'expiredAt',
      width: 140,
      cellRenderer: (params: { value: string | undefined }) => {
        if (!params.value) return <span className="text-gray-400">영구</span>;
        const isExpired = dayjs(params.value).isBefore(dayjs());
        return <span className={isExpired ? 'text-red-500' : 'text-orange-500'}>{isExpired ? '만료됨' : params.value.split(' ')[0]}</span>;
      },
    },
    {
      headerName: '사유',
      field: 'reason',
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { value: string }) => (
        <Tooltip title={params.value}>
          <span className="truncate">{params.value}</span>
        </Tooltip>
      ),
    },
    {
      headerName: '',
      width: 60,
      pinned: 'right',
      cellRenderer: (params: { data: UserAuth }) => <Button type="text" danger size="small" icon={<Trash2 className="size-3.5" />} onClick={() => handleDelete(params.data)} />,
    },
  ];

  const handleSearch = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const filtered = searchUserId ? userAuthDummyData.filter((u) => u.userId.includes(searchUserId)) : userAuthDummyData;
      setOverrides(filtered);
      setLoading(false);
    }, 300);
  }, [searchUserId]);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      message.success(`사용자 [${values.userId}]에게 권한이 ${values.grantType === 'GRANT' ? '부여' : '박탈'}되었습니다.`);
      setModalOpen(false);
      handleSearch();
    } catch (e) {
      // validation error
    }
  };

  const handleDelete = (item: UserAuth) => {
    Modal.confirm({
      title: '권한 설정 삭제',
      content: `사용자 [${item.userId}]의 "${item.permDescription}" 설정을 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        message.success('삭제되었습니다.');
        handleSearch();
      },
    });
  };

  // 통계
  const stats = {
    total: overrides.length,
    grants: overrides.filter((r) => r.grantType === 'GRANT').length,
    denies: overrides.filter((r) => r.grantType === 'DENY').length,
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="size-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">전체</div>
            <div className="text-lg font-bold">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="size-4 text-green-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">권한 부여</div>
            <div className="text-lg font-bold text-green-600">{stats.grants}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <XCircle className="size-4 text-red-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">권한 박탈</div>
            <div className="text-lg font-bold text-red-600">{stats.denies}</div>
          </div>
        </div>
      </div>

      {/* 검색 및 추가 */}
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <Space.Compact>
          <Select
            showSearch
            allowClear
            placeholder="사용자 선택"
            options={userOptions}
            value={searchUserId || undefined}
            onChange={(v) => setSearchUserId(v || '')}
            className="!w-[180px]"
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </Space.Compact>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleAdd}>
          권한 부여/박탈
        </Button>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<UserAuth> {...{ rowData: overrides, columnDefs, gridOptions, loading }} />
      </div>

      {/* 권한 부여/박탈 모달 */}
      <Modal title="사용자 권한 부여/박탈" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="저장" cancelText="취소" width={480}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="사용자" name="userId" rules={[{ required: true, message: '사용자를 선택하세요' }]}>
            <Select
              showSearch
              placeholder="사용자 선택"
              options={userOptions}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item label="권한" name="authId" rules={[{ required: true, message: '권한을 선택하세요' }]}>
            <Select
              showSearch
              placeholder="권한 선택"
              options={permissionOptions}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              optionRender={(option) => (
                <div>
                  <div>{option.data.description}</div>
                  <div className="text-xs text-gray-400">{option.data.permKey}</div>
                </div>
              )}
            />
          </Form.Item>
          <Form.Item label="유형" name="grantType" rules={[{ required: true, message: '유형을 선택하세요' }]}>
            <Radio.Group>
              <Radio.Button value="GRANT">
                <span className="flex items-center gap-1">
                  <CheckCircle className="size-3.5 text-green-500" />
                  권한 부여
                </span>
              </Radio.Button>
              <Radio.Button value="DENY">
                <span className="flex items-center gap-1">
                  <XCircle className="size-3.5 text-red-500" />
                  권한 박탈
                </span>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="만료일" name="expiredAt" help="미입력 시 영구 적용">
            <DatePicker showTime className="w-full" placeholder="만료일 선택 (선택사항)" />
          </Form.Item>
          <Form.Item label="사유" name="reason" rules={[{ required: true, message: '사유를 입력하세요' }]}>
            <Input.TextArea rows={2} placeholder="권한 부여/박탈 사유" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
