/**
 * 사용자 상세 페이지
 * - UserCreate 패턴 적용: Tabs + Summary sidebar
 * - Tab 1: 기본 정보 (사용자명, 계정, 설명)
 * - Tab 2: 권한 설정 (역할, 활성화, 비밀번호 변경 강제)
 * - Tab 3: 부가사항 (핸드폰번호, 이메일, 접근 허용 IP)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, Row, Select, Switch, Tabs, Tag } from 'antd';
import { Check, Plus, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetRoles } from '../../features/iam/hooks/useRoleQueries';
import { useDeleteUser, useGetUser, useUpdateUser } from '../../features/user/hooks/useUserQueries';
import type { UserRequest } from '../../features/user/types/user.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '자원 관리', path: '/core/resource' },
  { title: '사용자', path: '/core/resource/user' },
  { title: '상세', path: '' },
];

// 헬퍼 함수: Select 옵션에서 라벨 찾기
const getOptionLabel = (options: { label: string; value: string | number }[], value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  return options.find((opt) => opt.value === value)?.label ?? value;
};

// 헬퍼 함수: 빈 값일 때 - 표시
const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

// 날짜 포맷 유틸
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface UserFormValues {
  username: string;
  userAccount: string;
  description?: string;
  roleId?: number;
  enabled: boolean;
  forcePasswordChange?: boolean;
  phone?: string;
  email?: string;
  allowedIps?: string[];
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('1');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form] = Form.useForm<UserFormValues>();
  const [newIp, setNewIp] = useState('');
  const [ipError, setIpError] = useState('');
  const numericUserId = userId ? Number(userId) : undefined;

  // 역할 목록 조회
  const { data: roleList = [], isFetching: isFetchingRoles } = useGetRoles();
  const roleOptions = roleList.map((role) => ({ label: role.roleName, value: role.roleId }));

  // 사용자 조회
  const { data: user, isLoading } = useGetUser({
    id: numericUserId,
  });

  const formValues = Form.useWatch([], form);
  // allowedIps를 최상위에서 watch (훅 규칙 준수)
  const watchedAllowedIps: string[] = Form.useWatch('allowedIps', form) ?? [];

  // 폼 초기화
  useEffect(() => {
    if (user) {
      // allowedIps JSON 파싱
      let parsedAllowedIps: string[] = [];
      if (user.allowedIps) {
        try {
          parsedAllowedIps = JSON.parse(user.allowedIps);
        } catch {
          parsedAllowedIps = [];
        }
      }

      form.setFieldsValue({
        username: user.username,
        userAccount: user.userAccount,
        description: user.description,
        roleId: user.roleId,
        enabled: user.enabled,
        forcePasswordChange: user.forcePasswordChange ?? false,
        phone: user.phone,
        email: user.email,
        allowedIps: parsedAllowedIps,
      });
    }
  }, [user, form]);

  // formValues 변경 시 validation 실행
  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => {
        setFieldErrors({});
      })
      .catch((errorInfo) => {
        const errors: Record<string, string[]> = {};
        errorInfo.errorFields?.forEach((field: { name: string[]; errors: string[] }) => {
          const fieldName = field.name[0];
          errors[fieldName] = field.errors;
        });
        setFieldErrors(errors);
      });
  }, [formValues, form]);

  const tabs = [
    { key: '1', label: '기본 정보', content: renderTab1 },
    { key: '2', label: '권한 설정', content: renderTab2 },
    { key: '3', label: '부가사항', content: renderTab3 },
  ];

  const updateUserMutation = useUpdateUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자 정보가 수정되었습니다.');
      },
      onError: () => {
        toast.error('사용자 정보 수정에 실패했습니다.');
      },
    },
  });

  const deleteUserMutation = useDeleteUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 삭제되었습니다.');
        navigate('../list');
      },
      onError: () => {
        toast.error('사용자 삭제에 실패했습니다.');
      },
    },
  });

  const handleSubmitBtn = () => {
    form.submit();
  };

  const onFinish: FormProps<UserFormValues>['onFinish'] = (values) => {
    if (!numericUserId) return;

    const requestData: UserRequest = {
      username: values.username,
      userAccount: values.userAccount,
      description: values.description,
      roleId: values.roleId,
      enabled: values.enabled ?? true,
      forcePasswordChange: values.forcePasswordChange,
      phone: values.phone,
      email: values.email,
      // allowedIps를 JSON 문자열로 변환
      allowedIps: values.allowedIps?.length ? JSON.stringify(values.allowedIps) : undefined,
    };
    updateUserMutation.mutate({
      userId: numericUserId,
      data: requestData,
    });
  };

  const onFinishFailed: FormProps<UserFormValues>['onFinishFailed'] = () => {
    toast.error('필수 항목을 확인해주세요.');
  };

  const handleDelete = () => {
    if (numericUserId) {
      deleteUserMutation.mutate(numericUserId);
    }
  };

  const handleCancel = () => {
    navigate('../list');
  };

  // Tab 1: 기본 정보
  function renderTab1() {
    return (
      <>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="사용자명"
              required
              hasFeedback
              rules={[
                { required: true, message: '사용자명을 입력해 주세요.' },
                { min: 2, message: '최소 2자 이상 입력해주세요.' },
                { max: 50, message: '최대 50자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="사용자 이름을 입력하세요." disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="userAccount"
              label="계정 (로그인 ID)"
              required
              hasFeedback
              rules={[
                { required: true, message: '계정을 입력해 주세요.' },
                { min: 3, message: '최소 3자 이상 입력해주세요.' },
                { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: '영문, 숫자, 언더스코어(_)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="로그인에 사용할 계정을 입력하세요." disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={24}>
            <Form.Item name="description" label="설명" rules={[{ max: 500, message: '최대 500자까지 입력 가능합니다.' }]}>
              <Input.TextArea placeholder="사용자에 대한 설명을 입력하세요." rows={3} showCount maxLength={500} />
            </Form.Item>
          </Col>
        </Row>
        {user && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">생성일:</span> {formatDateTime(user.createdAt)}
            </div>
            <div>
              <span className="font-medium">수정일:</span> {formatDateTime(user.updatedAt)}
            </div>
            <div>
              <span className="font-medium">최근 로그인:</span> {formatDateTime(user.lastLoginAt)}
            </div>
            <div>
              <span className="font-medium">비밀번호 변경일:</span> {formatDateTime(user.passwordChangedAt)}
            </div>
          </div>
        )}
      </>
    );
  }

  // Tab 2: 권한 설정
  function renderTab2() {
    return (
      <>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="roleId" label="역할">
              <Select options={roleOptions} allowClear showSearch optionFilterProp="label" placeholder="역할을 선택하세요." loading={isFetchingRoles} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="enabled" label="활성화" valuePropName="checked">
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="forcePasswordChange" label="비밀번호 변경 강제" valuePropName="checked">
              <Switch checkedChildren="예" unCheckedChildren="아니오" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // IP 유효성 검사
  const validateIp = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  // IP 추가 핸들러
  const handleAddIp = () => {
    const trimmedIp = newIp.trim();
    if (!trimmedIp) {
      setIpError('IP 주소를 입력하세요.');
      return;
    }
    if (!validateIp(trimmedIp)) {
      setIpError('올바른 IP 주소 형식이 아닙니다. (예: 192.168.1.1)');
      return;
    }
    if (watchedAllowedIps.includes(trimmedIp)) {
      setIpError('이미 추가된 IP 주소입니다.');
      return;
    }
    form.setFieldValue('allowedIps', [...watchedAllowedIps, trimmedIp]);
    setNewIp('');
    setIpError('');
  };

  // IP 제거 핸들러
  const handleRemoveIp = (ip: string) => {
    form.setFieldValue(
      'allowedIps',
      watchedAllowedIps.filter((item: string) => item !== ip),
    );
  };

  // IP 입력 키다운 핸들러
  const handleIpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIp();
    }
  };

  // Tab 3: 부가사항
  function renderTab3() {
    return (
      <>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="핸드폰번호"
              rules={[
                { max: 50, message: '최대 50자까지 입력 가능합니다.' },
                { pattern: /^[0-9-]*$/, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="예: 010-1234-5678" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="이메일"
              rules={[
                { max: 200, message: '최대 200자까지 입력 가능합니다.' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
              ]}
            >
              <Input placeholder="예: user@example.com" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={24}>
            {/* allowedIps는 hidden Form.Item으로 관리하고 UI는 별도로 렌더링 */}
            <Form.Item name="allowedIps" hidden>
              <Input />
            </Form.Item>
            <div className="ant-form-item">
              <div className="ant-form-item-label">
                <label title="접근 허용 IP">
                  접근 허용 IP
                  <span
                    className="ant-form-item-tooltip ml-1 text-gray-400 cursor-help"
                    title="사용자가 로그인할 수 있는 IP 주소를 설정합니다. 설정하지 않으면 모든 IP에서 접근 가능합니다."
                  >
                    ?
                  </span>
                </label>
              </div>
              <div className="ant-form-item-control">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newIp}
                      onChange={(e) => {
                        setNewIp(e.target.value);
                        setIpError('');
                      }}
                      onKeyDown={handleIpKeyDown}
                      placeholder="IP 주소 입력 (예: 192.168.1.1)"
                      className="flex-1"
                      status={ipError ? 'error' : undefined}
                    />
                    <Button type="primary" onClick={handleAddIp}>
                      <Plus className="w-4 h-4" />
                      추가
                    </Button>
                  </div>
                  {ipError && <div className="text-red-500 text-sm">{ipError}</div>}
                  {watchedAllowedIps.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                      {watchedAllowedIps.map((ip: string) => (
                        <Tag key={ip} closable onClose={() => handleRemoveIp(ip)} className="flex items-center gap-1 text-sm py-1 px-2">
                          {ip}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {watchedAllowedIps.length === 0 && <div className="text-gray-400 text-sm">등록된 IP가 없습니다. 모든 IP에서 접근 가능합니다.</div>}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </>
    );
  }

  // Validation 아이콘 렌더링
  const renderValidationIcon = (fieldName: string) => {
    const hasError = fieldErrors[fieldName] && fieldErrors[fieldName].length > 0;
    return hasError ? <X className="w-4 h-4 text-red-500 ml-2 shrink-0" /> : <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" />;
  };

  // 폼 정보 요약 렌더링
  function renderFormSummary() {
    const values = formValues ?? {};
    const { username, userAccount, description, roleId, enabled, forcePasswordChange, phone, email, allowedIps } = values as UserFormValues;

    if (isFetchingRoles || isLoading) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Tab 1: 기본 정보 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">사용자명</span>
            <span className="text-gray-800 font-medium flex-1">{displayValue(username)}</span>
            {renderValidationIcon('username')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">계정</span>
            <span className="text-gray-800 flex-1">{displayValue(userAccount)}</span>
            {renderValidationIcon('userAccount')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(description)}</span>
          </div>
        </div>
        <Divider className="!my-3" />
        {/* Tab 2: 권한 설정 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">역할</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(roleOptions, roleId))}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">활성화</span>
            <span className="text-gray-800 flex-1">
              {enabled ? <span className="text-green-600 font-medium">활성</span> : <span className="text-red-500 font-medium">비활성</span>}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">비밀번호 변경 강제</span>
            <span className="text-gray-800 flex-1">
              {forcePasswordChange ? <span className="text-orange-600 font-medium">예</span> : <span className="text-gray-500">아니오</span>}
            </span>
          </div>
        </div>
        <Divider className="!my-3" />
        {/* Tab 3: 부가사항 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">핸드폰번호</span>
            <span className="text-gray-800 flex-1">{displayValue(phone)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">이메일</span>
            <span className="text-gray-800 flex-1">{displayValue(email)}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-gray-500 w-28 shrink-0">접근 허용 IP</span>
            <span className="text-gray-800 flex-1">
              {allowedIps && allowedIps.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {allowedIps.map((ip: string) => (
                    <Tag key={ip} className="text-xs">
                      {ip}
                    </Tag>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">전체 허용</span>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Footer: 취소, 삭제, 저장 버튼
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={handleCancel}>
            취소
          </Button>
        </Col>
        <Col>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button danger>삭제</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>이 작업은 되돌릴 수 없습니다. 사용자 계정이 영구적으로 삭제됩니다.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Col>
        <Col>
          <Button variant="solid" color="primary" onClick={handleSubmitBtn} loading={updateUserMutation.isPending}>
            저장
          </Button>
        </Col>
      </Row>
    );
  }

  if (isLoading) {
    return <FallbackSpinner />;
  }

  if (!user) {
    return <div className="p-6">사용자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="사용자 상세" breadcrumb={breadcrumb} />
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs.map((tab) => ({ key: tab.key, label: tab.label }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${tabs.length * 250}px` }}
        />
      </div>

      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
              {isFetchingRoles ? (
                <div className="flex items-center justify-center w-full h-full">
                  <FallbackSpinner />
                </div>
              ) : (
                <>
                  {tabs.map((tab) => (
                    <div key={tab.key} style={{ display: activeTab === tab.key ? 'block' : 'none' }}>
                      {tab.content()}
                    </div>
                  ))}
                </>
              )}
            </Form>
          </div>
          <div className="w-full px-7 pb-7">{renderFooter()}</div>
        </div>
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
