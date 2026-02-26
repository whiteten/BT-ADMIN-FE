/**
 * OAuth2 클라이언트 생성 페이지
 * - 단일 페이지 (Steps 없음)
 * - 기본정보 + 권한 선택 (Transfer 컴포넌트)
 * - 생성 성공 시 ClientSecretDialog 표시 (1회만)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Switch, Transfer, type TransferProps } from 'antd';
import { toast } from '@/shared-util';
import ClientSecretDialog from '../../features/client/components/ClientSecretDialog';
import { useCreateClient } from '../../features/client/hooks/useClientQueries';
import { type Client, type ClientCreateRequest, transformToBackendFormat } from '../../features/client/types/client.types';
import { useGetAuthList } from '../../features/iam/hooks/usePermissionQueries';
import type { PermissionFlat } from '../../features/iam/types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb = [
  { title: '자원 관리', path: '/manager/resource' },
  { title: '클라이언트 관리', path: '/manager/resource/client' },
  { title: '생성', path: '/manager/resource/client/create' },
];

interface ClientCreateFormValues {
  clientKey: string;
  clientName: string;
  description?: string;
  isActive: boolean;
}

export default function ClientCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm<ClientCreateFormValues>();

  // Transfer 상태
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  // Secret Dialog 상태
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [createdClient, setCreatedClient] = useState<{ clientKey: string; clientSecret: string } | null>(null);

  // 권한 목록 조회
  const { data: allPermissions, isLoading: isPermissionsLoading } = useGetAuthList();

  const { mutate: createClient, isPending: isCreating } = useCreateClient({
    mutationOptions: {
      onSuccess: (data) => {
        toast.success('클라이언트가 생성되었습니다.');
        // Secret Dialog 표시
        const client = data as Client;
        if (client.clientSecret) {
          setCreatedClient({
            clientKey: client.clientKey,
            clientSecret: client.clientSecret,
          });
          setSecretDialogOpen(true);
        } else {
          navigate('../list');
        }
      },
    },
  });

  // Transfer 핸들러
  const handleTransferChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const handleTransferSelectChange: TransferProps['onSelectChange'] = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  const handleCancel = () => {
    navigate('../list');
  };

  const handleSubmit = (values: ClientCreateFormValues) => {
    const requestData: ClientCreateRequest = {
      clientKey: values.clientKey,
      clientName: values.clientName,
      description: values.description,
      scopes: (targetKeys as string[]) ?? [],
      isActive: transformToBackendFormat(values.isActive),
    };

    createClient(requestData);
  };

  const handleSecretDialogClose = () => {
    setSecretDialogOpen(false);
    navigate('../list');
  };

  if (isPermissionsLoading) {
    return <FallbackSpinner />;
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="w-full h-full overflow-y-auto bg-white bt-shadow p-6">
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isActive: true }}>
          {/* 기본정보 섹션 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">기본 정보</h3>

            <Form.Item
              label="클라이언트 키"
              name="clientKey"
              rules={[
                { required: true, message: '클라이언트 키를 입력하세요.' },
                { pattern: /^[a-z0-9_-]+$/, message: '소문자, 숫자, -, _ 만 사용 가능합니다.' },
              ]}
            >
              <Input placeholder="예: my-oauth-client" maxLength={100} />
            </Form.Item>

            <Form.Item label="클라이언트명" name="clientName" rules={[{ required: true, message: '클라이언트명을 입력하세요.' }]}>
              <Input placeholder="클라이언트 이름" maxLength={200} />
            </Form.Item>

            <Form.Item label="설명" name="description">
              <Input.TextArea placeholder="클라이언트 설명" rows={3} maxLength={500} />
            </Form.Item>

            <Form.Item label="활성 여부" name="isActive" valuePropName="checked">
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
            </Form.Item>
          </div>

          {/* 권한 섹션 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">권한 설정</h3>
            <div className="flex mb-2">
              <span className="text-base text-[#495057] font-medium !w-[calc(50%+21px)]">전체 권한</span>
              <span className="text-base text-[#495057] font-medium">선택된 권한</span>
            </div>
            <Transfer<PermissionFlat>
              dataSource={allPermissions ?? []}
              rowKey={(item) => item.authKey}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={handleTransferChange}
              onSelectChange={handleTransferSelectChange}
              render={(item) => `${item.authKey}${item.description ? ` - ${item.description}` : ''}`}
              filterOption={(input, option) =>
                (option.authKey?.toLowerCase().includes(input.toLowerCase()) || option.description?.toLowerCase().includes(input.toLowerCase())) ?? false
              }
              classNames={{ section: '!w-full !h-[520px]' }}
              pagination={false}
              showSearch
              showSelectAll={true}
              locale={{
                notFoundContent: '데이터가 없습니다.',
                searchPlaceholder: '검색어를 입력하세요.',
              }}
              selectAllLabels={[(info) => `전체 선택 (총 ${info.totalCount}개)`, (info) => `전체 선택 (총 ${info.totalCount}개)`]}
              className="[&_.ant-transfer-list-header_.ant-dropdown-trigger]:!hidden"
            />
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button onClick={handleCancel}>취소</Button>
            <Button type="primary" htmlType="submit" loading={isCreating}>
              생성
            </Button>
          </div>
        </Form>
      </div>

      {/* Secret Dialog */}
      {createdClient && (
        <ClientSecretDialog open={secretDialogOpen} onOpenChange={handleSecretDialogClose} clientSecret={createdClient.clientSecret} clientKey={createdClient.clientKey} />
      )}
    </div>
  );
}
