/**
 * 사용자 권한 직접 할당 페이지 (User Override)
 * - 역할과 무관하게 개별 사용자에게 권한 부여(GRANT) 또는 박탈(DENY)
 * - 만료일 지정 가능 (임시 권한)
 * - 사유 기록 필수
 */

import { useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Tag, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle, Clock, Plus, Search, Shield, Trash2, XCircle } from 'lucide-react';

import { appDummyData, permissionDummyData, userAuthDummyData, userRoleDummyData } from '../../features/iam/data/iam-dummy';
import type { UserAuth, UserAuthGrantRequest } from '../../features/iam/types/iam.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';
import NoData from '@/libs/shared-ui/src/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// AG Grid 컬럼 정의
const columnDefs: ColDef<UserAuth>[] = [
  {
    headerName: '사용자ID',
    field: 'userId',
    width: 130,
    pinned: 'left',
  },
  {
    headerName: '유형',
    field: 'grantType',
    width: 100,
    cellRenderer: (params: { value: string }) => (
      <Tag color={params.value === 'GRANT' ? 'green' : 'red'} className="inline-flex items-center gap-1 whitespace-nowrap">
        {params.value === 'GRANT' ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
        {params.value === 'GRANT' ? '부여' : '박탈'}
      </Tag>
    ),
  },
  {
    headerName: '앱',
    field: 'appId',
    width: 100,
    cellRenderer: (params: { value: string }) => {
      const app = appDummyData.find((a) => a.appId === params.value);
      return <Tag color="cyan">{app?.appName || params.value}</Tag>;
    },
  },
  {
    headerName: '권한',
    field: 'permDescription',
    flex: 1,
    minWidth: 150,
  },
  {
    headerName: '권한 키',
    field: 'permKey',
    flex: 1,
    minWidth: 200,
    cellRenderer: (params: { value: string }) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{params.value}</code>,
  },
  {
    headerName: '만료일',
    field: 'expiredAt',
    width: 160,
    cellRenderer: (params: { value: string | undefined }) => {
      if (!params.value) {
        return (
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="size-3" />
            영구
          </span>
        );
      }
      const isExpired = dayjs(params.value).isBefore(dayjs());
      return (
        <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-orange-500'}`}>
          <Clock className="size-3" />
          {isExpired ? '만료됨' : params.value}
        </span>
      );
    },
  },
  {
    headerName: '사유',
    field: 'reason',
    flex: 1,
    minWidth: 200,
    cellRenderer: (params: { value: string }) => (
      <Tooltip title={params.value}>
        <span className="truncate">{params.value}</span>
      </Tooltip>
    ),
  },
  {
    headerName: '등록자',
    field: 'createdBy',
    width: 100,
  },
  {
    headerName: '등록일',
    field: 'createdAt',
    width: 160,
  },
];

// 사용자 옵션 (더미)
const userOptions = [...new Set(userRoleDummyData.map((u) => u.userId))].map((userId) => ({
  label: userId,
  value: userId,
}));

// 권한 옵션
const permissionOptions = permissionDummyData.map((p) => ({
  label: `[${p.appId}] ${p.description} (${p.permKey})`,
  value: p.authId,
  permKey: p.permKey,
}));

export default function UserAuthOverride() {
  const { gridOptions } = useAggridOptions();

  // 목록 상태
  const [rowData, setRowData] = useState<UserAuth[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState<string>('');

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 검색 실행
  const handleSearch = () => {
    setRowData([]);
    setLoading(true);

    setTimeout(() => {
      let filtered = userAuthDummyData;
      if (searchUserId) {
        filtered = filtered.filter((ua) => ua.userId.includes(searchUserId));
      }
      setRowData(filtered);
      setLoading(false);
    }, 300);
  };

  // 권한 부여/박탈 모달 열기
  const handleOpenModal = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  // 권한 부여/박탈 저장
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const request: UserAuthGrantRequest = {
        authId: values.authId,
        grantType: values.grantType,
        reason: values.reason,
        expiredAt: values.expiredAt?.format('YYYY-MM-DD HH:mm:ss'),
      };

      console.log('Save user auth override:', { userId: values.userId, ...request });

      // API 호출 시뮬레이션
      message.success(`사용자 [${values.userId}]에게 권한이 ${values.grantType === 'GRANT' ? '부여' : '박탈'}되었습니다.`);
      setIsModalOpen(false);

      // 목록 새로고침
      if (searchUserId) {
        handleSearch();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 권한 삭제
  const handleDelete = (userAuth: UserAuth) => {
    Modal.confirm({
      title: '권한 설정 삭제',
      content: (
        <div>
          <p>
            사용자 <strong>{userAuth.userId}</strong>의 다음 권한 설정을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {userAuth.grantType === 'GRANT' ? '부여' : '박탈'}: {userAuth.permDescription}
          </p>
        </div>
      ),
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        message.success('권한 설정이 삭제되었습니다.');
        handleSearch();
      },
    });
  };

  // 통계 계산
  const stats = {
    total: rowData.length,
    grants: rowData.filter((r) => r.grantType === 'GRANT').length,
    denies: rowData.filter((r) => r.grantType === 'DENY').length,
    expired: rowData.filter((r) => r.expiredAt && dayjs(r.expiredAt).isBefore(dayjs())).length,
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">전체 설정</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">권한 부여</p>
              <p className="text-xl font-bold text-green-600">{stats.grants}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">권한 박탈</p>
              <p className="text-xl font-bold text-red-600">{stats.denies}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">만료됨</p>
              <p className="text-xl font-bold text-orange-600">{stats.expired}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 헤더 영역 - 검색 및 추가 */}
      <header className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between">
        <Space.Compact className="w-full lg:w-auto">
          <Select
            showSearch
            placeholder="사용자 선택"
            options={userOptions}
            value={searchUserId || undefined}
            onChange={setSearchUserId}
            className="!w-[200px]"
            allowClear
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <Button type="primary" onClick={handleSearch} icon={<Search className="size-4" />}>
            검색
          </Button>
        </Space.Compact>

        <Button type="primary" onClick={handleOpenModal} icon={<Plus className="size-4" />}>
          권한 부여/박탈
        </Button>
      </header>

      {/* 본문 영역 - 그리드 */}
      <div className="max-lg:hidden w-full h-full">
        <AgGridReact<UserAuth>
          {...{
            rowData,
            columnDefs: [
              ...columnDefs,
              {
                headerName: '',
                width: 60,
                pinned: 'right',
                cellRenderer: (params: { data: UserAuth }) => <Button type="text" danger icon={<Trash2 className="size-4" />} onClick={() => handleDelete(params.data)} />,
              },
            ],
            gridOptions,
            loading,
          }}
        />
      </div>

      {/* 본문 영역 - 카드 뷰 (모바일) */}
      <div className="lg:hidden w-full h-full overflow-y-auto">
        {loading ? (
          <FallbackSpinner />
        ) : rowData.length > 0 ? (
          <div className="space-y-2">
            {rowData.map((ua, idx) => (
              <Card key={`${ua.userId}-${ua.authId}-${idx}`} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{ua.userId}</span>
                  <Tag color={ua.grantType === 'GRANT' ? 'green' : 'red'}>{ua.grantType === 'GRANT' ? '부여' : '박탈'}</Tag>
                </div>
                <div className="text-sm mb-2">
                  <Tag color="cyan">{appDummyData.find((a) => a.appId === ua.appId)?.appName}</Tag>
                  <span className="ml-2">{ua.permDescription}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">{ua.reason}</div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{ua.expiredAt || '영구'}</span>
                  <Button type="text" danger size="small" icon={<Trash2 className="size-3" />} onClick={() => handleDelete(ua)} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <NoData message="사용자를 선택하고 검색 버튼을 클릭하세요." />
        )}
      </div>

      {/* 권한 부여/박탈 모달 */}
      <Modal title="사용자 권한 부여/박탈" open={isModalOpen} onOk={handleSave} onCancel={() => setIsModalOpen(false)} okText="저장" cancelText="취소" width={500}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="사용자" name="userId" rules={[{ required: true, message: '사용자를 선택해주세요' }]}>
            <Select
              showSearch
              placeholder="사용자 선택"
              options={userOptions}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>

          <Form.Item label="권한" name="authId" rules={[{ required: true, message: '권한을 선택해주세요' }]}>
            <Select
              showSearch
              placeholder="권한 선택"
              options={permissionOptions}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>

          <Form.Item label="유형" name="grantType" rules={[{ required: true, message: '유형을 선택해주세요' }]}>
            <Select
              placeholder="유형 선택"
              options={[
                { label: '권한 부여 (GRANT)', value: 'GRANT' },
                { label: '권한 박탈 (DENY)', value: 'DENY' },
              ]}
            />
          </Form.Item>

          <Form.Item label="만료일" name="expiredAt" help="설정하지 않으면 영구 적용됩니다.">
            <DatePicker showTime className="w-full" placeholder="만료일 선택 (선택사항)" />
          </Form.Item>

          <Form.Item label="사유" name="reason" rules={[{ required: true, message: '사유를 입력해주세요' }]}>
            <Input.TextArea rows={3} placeholder="권한 부여/박탈 사유를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
