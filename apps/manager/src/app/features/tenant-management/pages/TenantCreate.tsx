import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, InputNumber, Radio, Row, Select, Steps, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { Check, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useCreateTenant } from '../hooks/useTenantQueries';
import { STAT_TYPE_LABELS, type TenantCreateData } from '../types/tenant.types';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시스템' }, { title: '자원관리' }, { title: '테넌트 등록' }];

const contractStatusOptions = [
  { label: '요청', value: '1' },
  { label: '계약', value: '2' },
  { label: '정지', value: '3' },
  { label: '해지', value: '9' },
];

const statTypeOptions = Object.entries(STAT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value: Number(value),
}));

const PHONE_PATTERN = /^[0-9-]*$/;

const getOptionLabel = (options: { label: string; value: string | number }[], value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  return options.find((opt) => opt.value === value)?.label ?? value;
};

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

const formatNumber = (value: number | null | undefined): string => {
  if (value == null || value === 0) return '0';
  return value.toLocaleString();
};

export default function TenantCreate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form] = Form.useForm();

  const initialValues = {
    tenantName: '',
    tenantAlias: '',
    managerName: '',
    managerTelNo: '',
    managerMobileNo: '',
    managerEmail: '',
    tntAddr1: '',
    tntAddr2: '',
    tntTelNo: '',
    tntFaxNo: '',
    activeYn: 1,
    dashInitTime: dayjs('04:00', 'HH:mm'),
    custTalkMax: 3,
    statType: 0,
    accQwaittimeUseYn: 0,
    ivrQwaittimeUseYn: 0,
    contractStatus: '1',
    contractMonth: 12,
    contractStartDate: null,
    contractFinshDate: null,
    maxCoAmount: 0,
    maxExtAmount: 0,
    didLicAmount: 0,
    dodLicAmount: 0,
    maxCtiAmount: 0,
    maxArsAmount: 0,
    maxVlcAmount: 0,
    maxEmsAmount: 0,
  };

  const formValues = Form.useWatch([], form);

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
    { title: '기본 정보', requiredFieldNames: ['tenantName', 'tenantAlias'], content: renderStep1 },
    { title: '운영 설정', requiredFieldNames: ['custTalkMax'], content: renderStep2 },
    { title: '계약사항', requiredFieldNames: [] as string[], content: renderStep3 },
    { title: '계약 수량', requiredFieldNames: [] as string[], content: renderStep4 },
  ];

  const { mutate: createTenant, isPending } = useCreateTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트가 등록되었습니다.');
        navigate('../list');
      },
    },
  });

  const handleSubmitBtn = () => {
    form.submit();
  };

  const onFinish: FormProps<TenantCreateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const formData = { ...values } as Record<string, unknown>;
    const dashInitTime = formData.dashInitTime as dayjs.Dayjs | null;
    if (dashInitTime) {
      formData.dashInitHour = dashInitTime.format('HH');
      formData.dashInitMinute = dashInitTime.format('mm');
    }
    delete formData.dashInitTime;
    createTenant(formData as unknown as TenantCreateData);
  };

  const onFinishFailed: FormProps<TenantCreateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleNext = async () => {
    try {
      const fieldsToValidate = steps[currentStep].requiredFieldNames;
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      Log.warn(`Step ${currentStep + 1} validation failed`, error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // Step 1: 기본 정보
  function renderStep1() {
    return (
      <>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item
              name="tenantName"
              label="테넌트명"
              required
              hasFeedback
              rules={[
                { required: true, message: '테넌트명은 필수입니다.' },
                { max: 30, message: '테넌트명은 30자 이내여야 합니다.' },
              ]}
            >
              <Input placeholder="테넌트명을 입력하세요." maxLength={30} />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item
              name="tenantAlias"
              label="테넌트 별칭"
              required
              hasFeedback
              rules={[
                { required: true, message: '테넌트 별칭은 필수입니다.' },
                { max: 30, message: '테넌트 별칭은 30자 이내여야 합니다.' },
              ]}
            >
              <Input placeholder="별칭을 입력하세요." maxLength={30} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item name="managerName" label="담당자명" rules={[{ max: 30, message: '담당자명은 30자 이내여야 합니다.' }]}>
              <Input placeholder="담당자명을 입력하세요." maxLength={30} />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item
              name="managerTelNo"
              label="연락처"
              rules={[
                { max: 24, message: '연락처는 24자 이내여야 합니다.' },
                { pattern: PHONE_PATTERN, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="02-0000-0000" maxLength={24} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item
              name="managerMobileNo"
              label="핸드폰"
              rules={[
                { max: 24, message: '핸드폰은 24자 이내여야 합니다.' },
                { pattern: PHONE_PATTERN, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="010-0000-0000" maxLength={24} />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item
              name="managerEmail"
              label="이메일"
              rules={[
                { max: 256, message: '이메일은 256자 이내여야 합니다.' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
              ]}
            >
              <Input placeholder="user@example.com" maxLength={256} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item
              name="tntTelNo"
              label="전화번호"
              rules={[
                { max: 24, message: '전화번호는 24자 이내여야 합니다.' },
                { pattern: PHONE_PATTERN, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="02-0000-0000" maxLength={24} />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item
              name="tntFaxNo"
              label="팩스번호"
              rules={[
                { max: 24, message: '팩스번호는 24자 이내여야 합니다.' },
                { pattern: PHONE_PATTERN, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="02-0000-0000" maxLength={24} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={18}>
            <Form.Item name="tntAddr1" label="주소" rules={[{ max: 256, message: '주소는 256자 이내여야 합니다.' }]}>
              <Input placeholder="주소를 입력하세요." maxLength={256} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={18}>
            <Form.Item name="tntAddr2" rules={[{ max: 256, message: '상세 주소는 256자 이내여야 합니다.' }]}>
              <Input placeholder="상세 주소를 입력하세요." maxLength={256} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="activeYn" label="활성 여부">
              <Radio.Group>
                <Radio value={1}>활성</Radio>
                <Radio value={0}>비활성</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 2: 운영 설정
  function renderStep2() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="dashInitTime" label="CTI 모니터링 초기화">
              <TimePicker format="HH:mm" className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="custTalkMax"
              label="고객 동시 Talk 상담수"
              required
              rules={[
                { required: true, message: '동시 Talk 상담수는 필수입니다.' },
                { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
                { type: 'number', max: 99, message: '99 이내여야 합니다.' },
              ]}
            >
              <InputNumber min={0} max={99} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="statType" label="통계 집계 옵션" required rules={[{ required: true, message: '통계 집계 옵션은 필수입니다.' }]}>
              <Select options={statTypeOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="accQwaittimeUseYn" label="큐 누적 대기시간">
              <Radio.Group>
                <Radio value={1}>활성</Radio>
                <Radio value={0}>비활성</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ivrQwaittimeUseYn" label="IVR 전환 대기시간 포함">
              <Radio.Group>
                <Radio value={1}>활성</Radio>
                <Radio value={0}>비활성</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 3: 계약사항
  function renderStep3() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="contractStartDate" label="계약일자">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="contractFinshDate" label="만료일자">
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="contractMonth"
              label="계약기간 (개월)"
              rules={[
                { type: 'number', min: 1, message: '1개월 이상이어야 합니다.' },
                { type: 'number', max: 9999, message: '9999개월 이내여야 합니다.' },
              ]}
            >
              <InputNumber min={1} max={9999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="contractStatus" label="계약상태">
              <Select options={contractStatusOptions} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 4: 계약 수량
  function renderStep4() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="maxCoAmount" label="최대 국선수">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="maxExtAmount" label="최대 내선수">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="didLicAmount" label="계약 DID">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="dodLicAmount" label="계약 DOD">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="maxCtiAmount" label="CTI수">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="maxArsAmount" label="최대 ARS">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="maxVlcAmount" label="녹취수량">
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="maxEmsAmount" label="최대 운영자">
              <InputNumber min={0} max={999999} className="!w-full" />
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

  // 우측 요약 패널
  function renderFormSummary() {
    const values = formValues ?? initialValues;
    const {
      tenantName,
      tenantAlias,
      managerName,
      managerTelNo,
      managerMobileNo,
      managerEmail,
      tntAddr1,
      custTalkMax,
      statType,
      contractStatus,
      contractMonth,
      contractStartDate,
      contractFinshDate,
    } = values;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">기본 정보</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">테넌트명</span>
            <span className="text-gray-800 font-medium flex-1">{displayValue(tenantName)}</span>
            {renderValidationIcon('tenantName')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">별칭</span>
            <span className="text-gray-800 flex-1">{displayValue(tenantAlias)}</span>
            {renderValidationIcon('tenantAlias')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">담당자</span>
            <span className="text-gray-800 flex-1">{displayValue(managerName)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">연락처</span>
            <span className="text-gray-800 flex-1">{displayValue(managerTelNo)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">핸드폰</span>
            <span className="text-gray-800 flex-1">{displayValue(managerMobileNo)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">이메일</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(managerEmail)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">주소</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(tntAddr1)}</span>
          </div>
        </div>
        {currentStep >= 1 && (
          <>
            <Divider className="!my-3" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">운영 설정</div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">CTI 초기화</span>
                <span className="text-gray-800 flex-1">{displayValue(values.dashInitTime ? (values.dashInitTime as dayjs.Dayjs).format?.('HH:mm') : null)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">Talk 상담</span>
                <span className="text-gray-800 flex-1">{displayValue(custTalkMax)}</span>
                {renderValidationIcon('custTalkMax')}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">통계옵션</span>
                <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(statTypeOptions, statType))}</span>
              </div>
            </div>
          </>
        )}
        {currentStep >= 2 && (
          <>
            <Divider className="!my-3" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">계약사항</div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">계약상태</span>
                <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(contractStatusOptions, contractStatus))}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">계약기간</span>
                <span className="text-gray-800 flex-1">{displayValue(contractMonth ? `${contractMonth}개월` : null)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">계약일자</span>
                <span className="text-gray-800 flex-1">{displayValue(contractStartDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">만료일자</span>
                <span className="text-gray-800 flex-1">{displayValue(contractFinshDate)}</span>
              </div>
            </div>
          </>
        )}
        {currentStep >= 3 && (
          <>
            <Divider className="!my-3" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">계약 수량</div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">국선</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.maxCoAmount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">내선</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.maxExtAmount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">DID</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.didLicAmount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">DOD</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.dodLicAmount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">CTI</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.maxCtiAmount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-20 shrink-0">ARS</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.maxArsAmount)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Footer: 이전, 다음, 저장 버튼
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('../list')}>
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
            <Button variant="solid" color="primary" onClick={handleSubmitBtn} loading={isPending}>
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
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStep}
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
