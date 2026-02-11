/**
 * OAuth2 클라이언트 상세/수정 페이지
 * - 단일 페이지 (탭 없음)
 * - 좌측: 메인 폼 영역 (기본정보 + 권한 섹션)
 * - 우측: 정보 요약 사이드패널 (xl 이상에서 표시)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Divider, Form, Input, Select, Switch, Tag, Transfer, type TransferProps } from 'antd';
import dayjs from 'dayjs';
import { Calendar, Hash, KeyRound } from 'lucide-react';
import { toast } from '@/shared-util';
import { clientQueryKeys, useDeleteClient, useGetAuthList, useGetClient, useUpdateClient } from '../../features/client/hooks/useClientQueries';
import { type ClientUpdateRequest, GRANT_TYPE_OPTIONS, transformToBackendFormat } from '../../features/client/types/client.types';
import type { PermissionFlat } from '../../features/iam/types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '자원 관리', path: '/manager/resource' },
  { title: '클라이언트 관리', path: '/manager/resource/client' },
  { title: '상세', path: '' },
];

interface ClientUpdateFormValues {
  clientName: string;
  description?: string;
  grantTypes: string[];
  isActive: boolean;
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm<ClientUpdateFormValues>();
  const formValues = Form.useWatch([], form);

  const numericClientId = clientId ? Number(clientId) : undefined;

  // Transfer 상태
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  // 데이터 조회
  const { data: client, isLoading } = useGetClient({
    params: { clientId: numericClientId },
    queryOptions: { enabled: !!numericClientId },
  });

  const { data: allPermissions, isLoading: isPermissionsLoading } = useGetAuthList();

  // 폼 초기화
  useEffect(() => {
    if (client) {
      form.setFieldsValue({
        clientName: client.clientName,
        description: client.description,
        grantTypes: client.grantTypes,
        isActive: client.isActive,
      });
      setTargetKeys(client.scopes || []);
    }
  }, [client, form]);

  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클라이언트 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: clientQueryKeys.getClient({ clientId: numericClientId }).queryKey });
        queryClient.invalidateQueries({ queryKey: clientQueryKeys.getClients().queryKey });
      },
    },
  });

  const { mutate: deleteClient, isPending: isDeleting } = useDeleteClient({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클라이언트가 삭제되었습니다.');
        navigate('../list');
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

  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => deleteClient({ clientId: numericClientId }),
    });
  };

  const handleSubmit = async (values: ClientUpdateFormValues) => {
    if (!client) return;

    const requestData: ClientUpdateRequest = {
      clientKey: client.clientKey, // 필수!
      clientName: values.clientName,
      description: values.description,
      scopes: (targetKeys as string[]) ?? [],
      isActive: transformToBackendFormat(values.isActive),
    };

    updateClient({ params: { clientId: numericClientId }, data: requestData });
  };

  // 현재 폼 값 (요약 패널용)
  const currentValues = formValues ?? {
    clientName: client?.clientName ?? '',
    grantTypes: client?.grantTypes ?? [],
    isActive: client?.isActive ?? false,
  };

  if (isLoading || isPermissionsLoading) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex items-center justify-center w-full h-full">
          <p>클라이언트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* 메인 폼 영역 */}
        <div className="flex-1 min-w-0 bg-white bt-shadow overflow-y-auto p-6">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 기본정보 섹션 */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">기본 정보</h3>

              <Form.Item label="클라이언트 키">
                <Input value={client.clientKey} disabled />
              </Form.Item>

              <Form.Item label="클라이언트명" name="clientName" rules={[{ required: true, message: '클라이언트명을 입력하세요.' }]}>
                <Input placeholder="클라이언트 이름" maxLength={200} />
              </Form.Item>

              <Form.Item label="설명" name="description">
                <Input.TextArea placeholder="클라이언트 설명" rows={3} maxLength={500} />
              </Form.Item>

              <Form.Item label="Grant Types" name="grantTypes" rules={[{ required: true, message: 'Grant Type을 선택하세요.' }]}>
                <Select mode="multiple" placeholder="Grant Type 선택" options={GRANT_TYPE_OPTIONS} />
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
              <Button danger onClick={handleDelete} loading={isDeleting}>
                삭제
              </Button>
              <Button type="primary" htmlType="submit" loading={isUpdating}>
                저장
              </Button>
            </div>
          </Form>
        </div>

        {/* 우측 사이드 패널 - 정보 요약 */}
        <div className="hidden xl:flex w-[320px] min-w-[320px] flex-col">
          <Card className="bt-shadow flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">클라이언트 정보</CardTitle>
              <CardDescription>현재 설정 요약</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* 기본 정보 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기본 정보</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">상태</span>
                      <Badge variant={currentValues.isActive ? 'default' : 'secondary'} className="text-xs">
                        {currentValues.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">클라이언트명</span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]" title={currentValues.clientName}>
                        {currentValues.clientName || '-'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-2">
                      <span className="text-sm text-gray-500">Grant Types</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[160px]">
                        {currentValues.grantTypes && currentValues.grantTypes.length > 0 ? (
                          currentValues.grantTypes.map((type) => (
                            <Tag key={type} color="blue" className="text-xs m-0">
                              {type}
                            </Tag>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Divider className="!my-3" />

                {/* 권한 정보 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">권한</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">선택된 권한 수</span>
                      <span className="text-sm font-medium text-gray-900">{(targetKeys?.length as number) || 0}개</span>
                    </div>
                  </div>
                </div>

                <Divider className="!my-3" />

                {/* 메타 정보 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">메타 정보</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">생성일</span>
                      <span className="text-sm font-medium text-gray-900">{client.createdAt ? dayjs(client.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">수정일</span>
                      <span className="text-sm font-medium text-gray-900">{client.updatedAt ? dayjs(client.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
