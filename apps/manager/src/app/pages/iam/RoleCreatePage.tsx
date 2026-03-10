/**
 * 역할 생성 페이지 (Steps 방식)
 * - Step 1: 기본 정보 입력 (역할코드, 역할이름, 설명, 정렬순서, 사용여부)
 * - Step 2: 권한 매핑 (체크박스 트리)
 * - 수정은 RoleDetailPage.tsx에서 Tab 방식으로 처리
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, InputNumber, Row, Steps, Switch, Tag } from 'antd';
import { Check, Shield, X } from 'lucide-react';
import { LOG } from '@/log';
import { sharedApi } from '@/shared-api';
import { toast } from '@/shared-util';
import PermissionSelector from '../../features/iam/components/PermissionSelector';
import { useGetGroupedPermissions } from '../../features/iam/hooks/usePermissionQueries';
import { useCreateRole, useGetRoles } from '../../features/iam/hooks/useRoleQueries';
import type { MenuWithPermissions, RoleCreateDatas } from '../../features/iam/types/iam.types';

type PermEntry = { authId: number; action: string };
import PageHeader from '@/components/custom/PageHeader';

/**
 * 메뉴와 모든 하위 메뉴의 권한을 재귀적으로 수집
 */
function collectAllPermissions(menu: MenuWithPermissions): PermEntry[] {
  const p = menu.permissions;
  const perms: PermEntry[] = [];
  if (p) {
    if (p.read != null) perms.push({ authId: p.read, action: 'read' });
    if (p.write != null) perms.push({ authId: p.write, action: 'write' });
    if (p.delete != null) perms.push({ authId: p.delete, action: 'delete' });
    if (p.apply != null) perms.push({ authId: p.apply, action: 'apply' });
    if (p.export != null) perms.push({ authId: p.export, action: 'export' });
  }
  for (const child of menu.children ?? []) {
    perms.push(...collectAllPermissions(child));
  }
  return perms;
}

const Log = new LOG('RoleCreatePage');

// 빈 값일 때 - 표시
const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

interface RoleFormValues {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse: boolean;
  canResetPassword: boolean;
}

export default function RoleCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [form] = Form.useForm<RoleFormValues>();

  // 역할 목록 조회 (중복 체크용)
  const { data: existingRoles = [] } = useGetRoles();

  // 권한 목록 조회 (요약 표시용)
  const { data: permissionGroups = [] } = useGetGroupedPermissions();

  // 전체 권한 목록 (flat) - 트리에서 재귀적으로 수집
  const allPermissions = useMemo(() => {
    return permissionGroups.flatMap((group) => group.menus.flatMap((menu) => collectAllPermissions(menu)));
  }, [permissionGroups]);

  const initialValues: RoleFormValues = {
    roleCode: '',
    roleName: '',
    description: '',
    sortOrder: 0,
    isUse: true,
    canResetPassword: false,
  };

  const formValues = Form.useWatch([], form);

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
    { title: '기본 정보', requiredFieldNames: ['roleCode', 'roleName'], content: renderStep1 },
    { title: '권한 매핑', requiredFieldNames: [], content: renderStep2 },
  ];

  // 역할 생성 Mutation
  const { mutate: createRole, isPending: isCreating } = useCreateRole({
    mutationOptions: {
      onSuccess: () => {
        toast.success('역할이 생성되었습니다.');
        navigate('/manager/resource/auth-group/list');
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRoles().queryKey });
      },
    },
  });

  // 역할 코드 중복 체크 Validator
  const validateRoleCode = async (_: unknown, value: string) => {
    if (!value) return Promise.resolve();
    const isDuplicate = existingRoles.some((role) => role.roleCode.toLowerCase() === value.toLowerCase());
    if (isDuplicate) {
      return Promise.reject(new Error('이미 사용 중인 역할 코드입니다.'));
    }
    return Promise.resolve();
  };

  // 역할 이름 중복 체크 Validator
  const validateRoleName = async (_: unknown, value: string) => {
    if (!value) return Promise.resolve();
    const isDuplicate = existingRoles.some((role) => role.roleName.toLowerCase() === value.toLowerCase());
    if (isDuplicate) {
      return Promise.reject(new Error('이미 사용 중인 역할 이름입니다.'));
    }
    return Promise.resolve();
  };

  const handleNext = async () => {
    try {
      await form.validateFields(steps[currentStep].requiredFieldNames);
      setCurrentStep(currentStep + 1);
    } catch (error) {
      Log.warn(`Step ${currentStep + 1} validation failed`, error);
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

  const handleSubmit = () => {
    form.submit();
  };

  const onFinish: FormProps<RoleFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const authIds = Array.from(selectedPermissions);

    const request: RoleCreateDatas = {
      ...values,
      canResetPassword: values.canResetPassword,
      authIds,
    };
    createRole(request);
  };

  const onFinishFailed: FormProps<RoleFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  // Breadcrumb 설정
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '자원 관리', path: '/manager/resource' },
    { title: '역할', path: '/manager/resource/auth-group/list' },
    { title: '역할 생성', path: '/manager/resource/role/create' },
  ];

  // Step 1: 기본 정보
  function renderStep1() {
    return (
      <>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              name="roleCode"
              label="역할 코드"
              required
              hasFeedback
              rules={[
                { required: true, message: '역할 코드를 입력해 주세요.' },
                { pattern: /^[A-Z][A-Z0-9_]*$/, message: '대문자로 시작하고 대문자, 숫자, 언더스코어(_)만 사용 가능합니다.' },
                { validator: validateRoleCode },
              ]}
            >
              <Input placeholder="역할 코드를 입력하세요. (예: ADMIN, MANAGER)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="roleName" label="역할 이름" required hasFeedback rules={[{ required: true, message: '역할 이름을 입력해 주세요.' }, { validator: validateRoleName }]}>
              <Input placeholder="역할 이름을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="sortOrder" label="정렬 순서">
              <InputNumber min={0} className="!w-full" placeholder="정렬 순서를 입력하세요." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isUse" label="사용 여부" valuePropName="checked">
              <Switch checkedChildren="사용" unCheckedChildren="미사용" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="canResetPassword"
              label="비밀번호 초기화 권한"
              valuePropName="checked"
              tooltip="이 역할을 가진 사용자가 다른 사용자의 비밀번호를 초기화할 수 있습니다."
            >
              <Switch checkedChildren="허용" unCheckedChildren="불가" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={24}>
            <Form.Item name="description" label="설명">
              <Input.TextArea rows={3} placeholder="역할에 대한 설명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 2: 권한 매핑
  function renderStep2() {
    return (
      <div className="h-full">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-800 mb-2">권한 선택</h3>
        </div>
        <PermissionSelector value={selectedPermissions} onChange={setSelectedPermissions} />
      </div>
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
    const { roleCode, roleName, description, sortOrder, isUse, canResetPassword } = values;

    return (
      <div className="space-y-4">
        {/* Step 1: 기본 정보 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">기본 정보</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">역할 코드</span>
            <span className="text-gray-800 font-medium flex-1 font-mono">{displayValue(roleCode)}</span>
            {renderValidationIcon('roleCode')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">역할 이름</span>
            <span className="text-gray-800 flex-1">{displayValue(roleName)}</span>
            {renderValidationIcon('roleName')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 whitespace-pre-wrap truncate">{displayValue(description)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">정렬 순서</span>
            <span className="text-gray-800 flex-1">{displayValue(sortOrder)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">사용 여부</span>
            <span className="flex-1">
              <Tag color={isUse ? 'green' : 'default'}>{isUse ? '사용' : '미사용'}</Tag>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">비밀번호 초기화</span>
            <span className="flex-1">
              <Tag color={canResetPassword ? 'blue' : 'default'}>{canResetPassword ? '허용' : '불가'}</Tag>
            </span>
          </div>
        </div>

        <Divider className="!my-3" />

        {/* Step 2: 권한 매핑 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">권한 매핑</div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-blue-500" />
            <span className="text-gray-800 font-semibold">{selectedPermissions.size}개 권한 선택됨</span>
          </div>
          {selectedPermissions.size > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.from(selectedPermissions)
                .slice(0, 8)
                .map((authId) => {
                  const perm = allPermissions.find((p) => p.authId === authId);
                  return perm ? (
                    <Tag key={authId} color="cyan" className="text-xs m-0">
                      {perm.action}
                    </Tag>
                  ) : null;
                })}
              {selectedPermissions.size > 8 && <span className="text-xs text-gray-400">외 {selectedPermissions.size - 8}개</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Footer: 이전, 다음, 저장 버튼
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/manager/resource/auth-group/list')}>
            취소
          </Button>
        </Col>
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
            <Button variant="solid" color="primary" onClick={handleSubmit} loading={isCreating}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Steps */}
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

      {/* Content */}
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* Main Form Area */}
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
              {steps.map((step, index) => (
                <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
                  {step.content()}
                </div>
              ))}
            </Form>
          </div>
          <div className="w-full px-7 pb-7">{renderFooter()}</div>
        </div>

        {/* Right Sidebar: Summary */}
        <div className="!w-[350px] !min-w-[350px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
