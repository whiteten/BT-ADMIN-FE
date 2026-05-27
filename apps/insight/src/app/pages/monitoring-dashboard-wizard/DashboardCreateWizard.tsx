/**
 * 대시보드 생성 위저드 — UserCreate 패턴 정렬 (Steps + Summary sidebar + bottom Footer).
 * - Step 1: 도메인 선택 (IE/IC/IR)
 * - Step 2: 기본 정보 (이름, 설명)
 * - 생성 후 자동으로 편집 화면으로 이동
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, Row, Steps } from 'antd';
import { Check, X } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { DOMAIN_LABELS } from '../../features/monitoring/constants/monitoringConstants';
import { dashboardKeys, useCreateDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import type { DomainCode } from '../../features/monitoring/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '대시보드', path: '/insight/monitoring/dashboards' },
  { title: '등록', path: '/insight/monitoring/dashboards/create' },
];

interface WizardFormValues {
  domainCode: DomainCode;
  dashboardName: string;
  description?: string;
}

const DOMAIN_CHOICES: Array<{ value: DomainCode; label: string; hint: string }> = [
  { value: 'IE', label: '교환기', hint: '내선·국선·트렁크·콜 라우팅' },
  { value: 'IC', label: 'CTI', hint: '상담사·상담그룹·통화·CDR' },
  { value: 'IR', label: 'IVR', hint: '시나리오·음성안내·통계' },
];

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return String(value);
};

export default function DashboardCreateWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [form] = Form.useForm<WizardFormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const initialValues: Partial<WizardFormValues> = {
    domainCode: 'IE',
  };
  const formValues = Form.useWatch([], form);

  // formValues 변경 시 validation 실행
  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setFieldErrors({}))
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
    { title: '도메인 선택', requiredFieldNames: ['domainCode'], content: renderStep1 },
    { title: '기본 정보', requiredFieldNames: ['dashboardName'], content: renderStep2 },
  ];

  const createDashboardMutation = useCreateDashboard({
    mutationOptions: {
      onSuccess: (dashboard) => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
        toast.success('새 대시보드가 생성되었습니다.');
        navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/edit`);
      },
      onError: () => toast.error('생성 중 오류가 발생했습니다.'),
    },
  });

  const handleSubmitBtn = () => form.submit();

  const onFinish: FormProps<WizardFormValues>['onFinish'] = (values) => {
    createDashboardMutation.mutate({
      domainCode: values.domainCode,
      dashboardName: values.dashboardName.trim(),
      description: values.description?.trim() || undefined,
    });
  };

  const onFinishFailed: FormProps<WizardFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const handleNext = async () => {
    try {
      await form.validateFields(steps[currentStep].requiredFieldNames);
      setCurrentStep(currentStep + 1);
    } catch {
      // antd가 자동 표시
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  // 이전 스텝으로만 이동 가능
  const handleStepClick = (targetStep: number) => {
    if (targetStep < currentStep) setCurrentStep(targetStep);
  };

  // Step 1: 도메인 선택
  function renderStep1() {
    const selectedDomain = (formValues?.domainCode ?? initialValues.domainCode) as DomainCode;
    return (
      <>
        <Form.Item name="domainCode" label="도메인" required tooltip="생성 후에는 변경할 수 없습니다." rules={[{ required: true, message: '도메인을 선택해 주세요.' }]}>
          <div className="grid grid-cols-3 gap-3">
            {DOMAIN_CHOICES.map((d) => {
              const active = selectedDomain === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => form.setFieldValue('domainCode', d.value)}
                  className={`flex flex-col items-start gap-2 rounded p-4 text-left transition-colors ${
                    active
                      ? 'border-2 border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]'
                      : 'border border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]'
                  }`}
                >
                  <span className="rounded bg-[var(--color-bt-primary)] px-2 py-0.5 font-mono text-[11px] font-bold text-white">{d.value}</span>
                  <span className={`text-[14px] font-semibold ${active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg)]'}`}>{d.label}</span>
                  <span className="text-[11px] text-[var(--color-bt-fg-muted)]">{d.hint}</span>
                </button>
              );
            })}
          </div>
        </Form.Item>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          <strong>안내:</strong> 모니터링 대상 도메인을 결정합니다. 위젯 카탈로그와 데이터셋이 도메인 단위로 분리되어 노출됩니다.
        </div>
      </>
    );
  }

  // Step 2: 기본 정보
  function renderStep2() {
    return (
      <>
        <Row gutter={20}>
          <Col span={24}>
            <Form.Item
              name="dashboardName"
              label="대시보드 이름"
              required
              hasFeedback
              rules={[
                { required: true, message: '대시보드 이름을 입력해 주세요.' },
                { whitespace: true, message: '대시보드 이름을 입력해 주세요.' },
                { max: 120, message: '최대 120자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="예: 교환기 운영 관제" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={24}>
            <Form.Item name="description" label="설명" rules={[{ max: 500, message: '최대 500자까지 입력 가능합니다.' }]}>
              <Input.TextArea placeholder="이 대시보드의 용도·범위를 간단히 입력하세요." rows={3} showCount maxLength={500} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Validation 아이콘
  const renderValidationIcon = (fieldName: string) => {
    const hasError = fieldErrors[fieldName] && fieldErrors[fieldName].length > 0;
    return hasError ? <X className="w-4 h-4 text-red-500 ml-2 shrink-0" /> : <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" />;
  };

  // 폼 요약
  function renderFormSummary() {
    const values = (formValues ?? initialValues) as WizardFormValues;
    const { domainCode, dashboardName, description } = values;
    const domainLabel = domainCode ? `${domainCode} · ${DOMAIN_LABELS[domainCode]}` : null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">도메인</span>
            <span className="text-gray-800 font-medium flex-1">{displayValue(domainLabel)}</span>
            {renderValidationIcon('domainCode')}
          </div>
        </div>
        <Divider className="!my-3" />
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">대시보드 이름</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(dashboardName)}</span>
            {renderValidationIcon('dashboardName')}
          </div>
          <div className="flex items-start gap-1">
            <span className="text-gray-500 w-28 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 break-words">{displayValue(description)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Footer
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/insight/monitoring/dashboards')}>
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
            <Button variant="solid" color="primary" onClick={handleSubmitBtn} loading={createDashboardMutation.isPending}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
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
              {steps.map((step, index) => (
                <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
                  {step.content()}
                </div>
              ))}
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
