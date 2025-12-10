import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Divider, Form, type FormProps, Input, Row, Select, type SelectProps, Slider, Steps, Tag } from 'antd';
import { Check, X } from 'lucide-react';
import { Log } from '@/log';
import { useCreateServiceBot } from '../../../features/bot-config/hooks/useServiceBotQueries';
import type { ServiceBotCreateDatas } from '../../../features/bot-config/types';
import { IconTag } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';

const modelOptions = [
  { label: 'NLU 모델 1', value: '1200000001' },
  { label: 'NLU 모델 2', value: '1200000002' },
  { label: 'NLU 모델 3', value: '1200000003' },
];
const sttOptions = [
  { label: 'STT 타입 1', value: 1000000001 },
  { label: 'STT 타입 2', value: 1000000002 },
  { label: 'STT 타입 3', value: 1000000003 },
];
const ttsOptions = [
  { label: 'TTS 타입 1', value: 1100000001 },
  { label: 'TTS 타입 2', value: 1100000002 },
  { label: 'TTS 타입 3', value: 1100000003 },
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

export default function ServiceBotCreate() {
  const navigate = useNavigate();
  const { TextArea } = Input;
  const [confidence, setConfidence] = useState([40, 80]);
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form] = Form.useForm();

  const initialValues = { modelId: null, confidence: [40, 80], tags: [], sttId: null, ttsId: null, ttsSpeaker: '', ttsSpeed: 100, ttsVolume: 100, ttsPitch: 100 };
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
    { title: '기본 정보', requiredFieldNames: ['serviceName', 'modelId', 'confidence'], content: renderStep1 },
    { title: 'STT & TTS 설정', requiredFieldNames: ['sttId', 'ttsId'], content: renderStep2 },
  ];

  const { mutate: createServiceBot, isPending } = useCreateServiceBot({
    mutationOptions: {
      onSuccess: () => {
        navigate('../list');
      },
    },
  });

  const getSliderRailBackground = () => {
    const [min, max] = confidence;
    return `linear-gradient(to right, #F06548 0%, #F06548 ${min}%, #d9d9d9 ${min}%, #d9d9d9 ${max}%, #405189 ${max}%, #405189 100%)`;
  };

  const tagRender: SelectProps['tagRender'] = (props) => {
    const { label, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };
    return (
      <Tag
        variant="filled"
        icon={<IconTag className="mr-0.5" />}
        className="!inline-flex items-center !px-2 !py-1 !mr-1"
        classNames={{ content: 'max-w-[80px] truncate' }}
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
      >
        {label}
      </Tag>
    );
  };

  const handleValuesChange: FormProps<ServiceBotCreateDatas>['onValuesChange'] = (changedFields, allFields) => {
    Log.debug('handleValuesChange', changedFields, allFields);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const onFinish: FormProps<ServiceBotCreateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    createServiceBot(values as ServiceBotCreateDatas);
  };

  const onFinishFailed: FormProps<ServiceBotCreateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
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

  // Step 1: 기본 정보
  function renderStep1() {
    return (
      <>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="serviceName" label="봇 이름" required hasFeedback rules={[{ required: true, message: '봇 이름을 입력해 주세요.' }]}>
              <Input placeholder="봇 이름을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={24}>
            <Form.Item name="serviceDesc" label="봇 설명">
              <TextArea rows={4} placeholder="봇 설명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item name="modelId" label="NLU 모델" required hasFeedback rules={[{ required: true, message: 'NLU 모델을 선택해 주세요.' }]}>
              <Select options={modelOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="봇이 이용할 언어 모델을 선택하세요." />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name="confidence" label="신뢰도" required hasFeedback rules={[{ required: true, message: '신뢰도를 설정해 주세요.' }]}>
              <Slider
                range
                value={confidence}
                onChange={setConfidence}
                min={0}
                max={100}
                step={1}
                marks={{ 0: '0', 100: '100' }}
                tooltip={{ formatter: (value) => `${value}%` }}
                styles={{
                  rail: { background: getSliderRailBackground() },
                  track: { background: 'transparent' },
                }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={18}>
            <Form.Item name="tags" label="태그">
              <Select mode="tags" tagRender={tagRender} classNames={{ root: '!p-1' }} placeholder="태그를 입력하세요(Enter로 추가)" tokenSeparators={[',']} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 2: STT/TTS 설정
  function renderStep2() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="sttId" label="STT 타입" required rules={[{ required: true, message: 'STT 타입을 선택해 주세요.' }]}>
              <Select options={sttOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="STT 타입을 선택하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={8}>
            <Form.Item name="ttsId" label="TTS 타입" required rules={[{ required: true, message: 'TTS 타입을 선택해 주세요.' }]}>
              <Select options={ttsOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="TTS 타입을 선택하세요." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ttsSpeaker" label="TTS 발화자">
              <Input placeholder="TTS 발화자를 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={8}>
            <Form.Item name="ttsSpeed" label="TTS 속도">
              <Slider min={50} max={150} step={1} marks={{ 50: '50', 150: '150' }} tooltip={{ formatter: (value) => `${value}%` }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ttsVolume" label="TTS 볼륨">
              <Slider min={50} max={150} step={1} marks={{ 50: '50', 150: '150' }} tooltip={{ formatter: (value) => `${value}%` }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ttsPitch" label="TTS 피치">
              <Slider min={50} max={150} step={1} marks={{ 50: '50', 150: '150' }} tooltip={{ formatter: (value) => `${value}%` }} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Validation 아이콘 렌더링 (fieldErrors state 활용)
  const renderValidationIcon = (fieldName: string) => {
    const hasError = fieldErrors[fieldName] && fieldErrors[fieldName].length > 0;
    return hasError ? <X className="w-4 h-4 text-red-500 ml-2 shrink-0" /> : <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" />;
  };

  // 폼 정보 요약 렌더링
  function renderFormSummary() {
    const values = formValues ?? initialValues;
    const { serviceName, serviceDesc, modelId, confidence: confValue, tags, sttId, ttsId, ttsSpeaker, ttsSpeed, ttsVolume, ttsPitch } = values;
    return (
      <div className="space-y-4">
        {/* Step 1: 기본 정보 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">봇 이름</span>
            <span className="text-gray-800 font-medium flex-1">{displayValue(serviceName)}</span>
            {renderValidationIcon('serviceName')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">봇 설명</span>
            <span className="text-gray-800 flex-1 whitespace-pre-wrap">{displayValue(serviceDesc)}</span>
            {renderValidationIcon('serviceDesc')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">NLU 모델</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(modelOptions, modelId))}</span>
            {renderValidationIcon('modelId')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">신뢰도</span>
            <span className="text-gray-800 flex-1">
              {confValue ? (
                <>
                  <span className="font-semibold text-[#f06548]">{confValue[0]}%</span>
                  <span className="mx-1">~</span>
                  <span className="font-semibold text-[#405189]">{confValue[1]}%</span>
                </>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </span>
            {renderValidationIcon('confidence')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">태그</span>
            <div className="flex flex-wrap gap-1 flex-1">
              {tags && tags.length > 0 ? (
                tags.map((tag: string, index: number) => (
                  <Tag
                    key={index}
                    variant="filled"
                    icon={<IconTag className="mr-0.5" />}
                    className="!inline-flex items-center !px-2 !py-1 !m-0"
                    classNames={{ content: 'max-w-[80px] truncate' }}
                  >
                    {tag}
                  </Tag>
                ))
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </div>
            {renderValidationIcon('tags')}
          </div>
        </div>
        <Divider className="!my-3" />
        {/* Step 2: STT & TTS 설정 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">STT 타입</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(sttOptions, sttId))}</span>
            {renderValidationIcon('sttId')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">TTS 타입</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(ttsOptions, ttsId))}</span>
            {renderValidationIcon('ttsId')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">TTS 발화자</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(ttsSpeaker)}</span>
            {renderValidationIcon('ttsSpeaker')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">TTS 속도</span>
            <span className="text-gray-800 flex-1">{displayValue(ttsSpeed)}%</span>
            {renderValidationIcon('ttsSpeed')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">TTS 볼륨</span>
            <span className="text-gray-800 flex-1">{displayValue(ttsVolume)}%</span>
            {renderValidationIcon('ttsVolume')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">TTS 피치</span>
            <span className="text-gray-800 flex-1">{displayValue(ttsPitch)}%</span>
            {renderValidationIcon('ttsPitch')}
          </div>
        </div>
      </div>
    );
  }

  // Footer: 이전, 다음, 저장 버튼
  function renderFooter() {
    return (
      // <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7 pt-4">
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
      <PageHeader title="봇 생성" breadcrumb="봇 관리 > 봇 > 봇 생성" />
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
            <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical" onValuesChange={handleValuesChange}>
              {steps.map((step, index) => (
                <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
                  {step.content()}
                </div>
              ))}
            </Form>
          </div>
          <div className="w-full px-7 pb-7">{renderFooter()}</div>
        </div>
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow p-5 hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
