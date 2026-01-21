/**
 * 사용자 생성 페이지
 * - BotCreate 패턴 적용: Steps wizard + Summary sidebar
 * - Step 1: 기본 정보 (사용자명, 계정, 설명, 역할, 활성화)
 * - Step 2: 부가사항 (핸드폰번호, 이메일, 접근 허용 IP)
 * - 초기 비밀번호는 계정(userAccount)과 동일하게 백엔드에서 자동 설정
 * - forcePasswordChange 기본값 true로 첫 로그인 시 비밀번호 변경 유도
 * - 역할(roleId)은 필수값이며, TB_BT_CM_USER_ROLE_MAP 테이블에 매핑됨
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, Row, Select, Steps, Switch, Tag } from 'antd';
import { Check, Plus, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetRoles } from '../../features/iam/hooks/useRoleQueries';
import { useCreateUser } from '../../features/user/hooks/useUserQueries';
import type { UserRequest } from '../../features/user/types/user.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '자원 관리', path: '/core/resource' },
  { title: '사용자', path: '/core/resource/user' },
  { title: '등록', path: '/core/resource/user/create' },
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

interface UserFormValues {
  username: string;
  userAccount: string;
  description?: string;
  roleId?: number;
  enabled: boolean;
  phone?: string;
  email?: string;
  allowedIps?: string[];
}

export default function UserCreate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form] = Form.useForm<UserFormValues>();
  const [newIp, setNewIp] = useState('');
  const [ipError, setIpError] = useState('');

  // 역할 목록 조회
  const { data: roleList = [], isFetching: isFetchingRoles } = useGetRoles();
  const roleOptions = roleList.map((role) => ({ label: role.roleName, value: role.roleId }));

  const initialValues: Partial<UserFormValues> = {
    enabled: true,
  };
  const formValues = Form.useWatch([], form);
  // allowedIps를 최상위에서 watch (훅 규칙 준수)
  const watchedAllowedIps: string[] = Form.useWatch('allowedIps', form) ?? [];

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

  const steps = [
    { title: '기본 정보', requiredFieldNames: ['username', 'userAccount', 'roleId'], content: renderStep1 },
    { title: '부가사항', requiredFieldNames: [], content: renderStep2 },
  ];

  const createUserMutation = useCreateUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 생성되었습니다.');
        navigate('../list');
      },
      onError: () => {
        toast.error('사용자 생성에 실패했습니다.');
      },
    },
  });

  const handleSubmitBtn = () => {
    form.submit();
  };

  const onFinish: FormProps<UserFormValues>['onFinish'] = (values) => {
    const requestData: UserRequest = {
      username: values.username,
      userAccount: values.userAccount,
      description: values.description,
      roleId: values.roleId,
      enabled: values.enabled ?? true,
      phone: values.phone,
      email: values.email,
      // allowedIps를 JSON 문자열로 변환
      allowedIps: values.allowedIps?.length ? JSON.stringify(values.allowedIps) : undefined,
      // 초기 비밀번호는 백엔드에서 userAccount와 동일하게 자동 설정
      // forcePasswordChange는 백엔드에서 true로 자동 설정
    };
    createUserMutation.mutate(requestData);
  };

  const onFinishFailed: FormProps<UserFormValues>['onFinishFailed'] = () => {
    toast.error('필수 항목을 확인해주세요.');
  };

  const handleNext = async () => {
    try {
      await form.validateFields(steps[currentStep].requiredFieldNames);
      setCurrentStep(currentStep + 1);
    } catch {
      // validation failed
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // 스텝 클릭 핸들러: 완료한 스텝(이전 스텝)으로만 이동 가능
  const handleStepClick = (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    }
  };

  // Step 1: 기본 정보 (역할, 활성화 포함)
  function renderStep1() {
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
              <Input placeholder="사용자 이름을 입력하세요." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="userAccount"
              label="계정 (로그인 ID)"
              required
              hasFeedback
              tooltip="초기 비밀번호는 계정과 동일하게 설정됩니다."
              rules={[
                { required: true, message: '계정을 입력해 주세요.' },
                { min: 3, message: '최소 3자 이상 입력해주세요.' },
                { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: '영문, 숫자, 언더스코어(_)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="로그인에 사용할 계정을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="roleId" label="역할" required hasFeedback rules={[{ required: true, message: '역할을 선택해 주세요.' }]}>
              <Select options={roleOptions} showSearch optionFilterProp="label" placeholder="역할을 선택하세요." loading={isFetchingRoles} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="enabled" label="활성화" valuePropName="checked">
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
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
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          <strong>안내:</strong> 초기 비밀번호는 계정(로그인 ID)과 동일하게 설정되며, 사용자는 첫 로그인 시 비밀번호를 변경해야 합니다.
        </div>
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

  // Step 2: 부가사항
  function renderStep2() {
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
    const values = formValues ?? initialValues;
    const { username, userAccount, description, roleId, enabled, phone, email, allowedIps } = values as UserFormValues;

    if (isFetchingRoles) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Step 1: 기본 정보 (역할, 활성화 포함) */}
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
            <span className="text-gray-500 w-28 shrink-0">역할</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(roleOptions, roleId))}</span>
            {renderValidationIcon('roleId')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">활성화</span>
            <span className="text-gray-800 flex-1">
              {enabled ? <span className="text-green-600 font-medium">활성</span> : <span className="text-red-500 font-medium">비활성</span>}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">초기 비밀번호</span>
            <span className="text-gray-800 flex-1 text-blue-600">{userAccount ? '계정과 동일' : <span className="text-gray-300">-</span>}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(description)}</span>
          </div>
        </div>
        <Divider className="!my-3" />
        {/* Step 2: 부가사항 */}
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

  // Footer: 이전, 다음, 저장 버튼
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={handlePrev}>
              이전
            </Button>
          </Col>
        )}
        {currentStep < steps.length - 1 && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {currentStep === steps.length - 1 && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmitBtn} loading={createUserMutation.isPending}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="사용자 등록" breadcrumb={breadcrumb} />
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStep}
          onChange={handleStepClick}
          items={steps.map((step) => ({ title: step.title }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${steps.length * 250}px` }}
          responsive={false}
        />
      </div>

      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
              {isFetchingRoles ? (
                <div className="flex items-center justify-center w-full h-full">
                  <FallbackSpinner />
                </div>
              ) : (
                <>
                  {steps.map((step, index) => (
                    <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
                      {step.content()}
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
