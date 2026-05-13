import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Checkbox, Col, Form, Input, Row, Steps } from 'antd';
import { Brain, Check, Cpu, type LucideIcon, Server, Sparkles, Wand2, X, Zap } from 'lucide-react';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useCreateModel, useValidateModel } from '../../features/agent-config/hooks/useModelQueries';
import type { AvailableModelItem } from '../../features/agent-config/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'AI 모델', path: '/aoe/agent-config/model' },
  { title: 'AI 모델 추가', path: '/aoe/agent-config/model/create' },
];

interface ProviderConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  bg: string;
}

const PROVIDERS: ProviderConfig[] = [
  { key: 'openai', label: 'OpenAI', icon: Sparkles, bg: 'bg-emerald-500' },
  { key: 'anthropic', label: 'Anthropic', icon: Brain, bg: 'bg-purple-500' },
  { key: 'google', label: 'Google', icon: Wand2, bg: 'bg-red-500' },
  { key: 'vllm', label: 'vLLM', icon: Server, bg: 'bg-blue-500' },
  { key: 'ollama', label: 'Ollama', icon: Cpu, bg: 'bg-orange-500' },
];

const NO_API_KEY_PROVIDERS = ['vllm', 'ollama'];

interface Step1FormValues {
  modelType: string;
  modelName: string;
  apiKey: string;
}

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

export default function ModelCreate() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [form] = Form.useForm<Step1FormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<AvailableModelItem[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { mutate: createModel, isPending: isCreating } = useCreateModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 추가되었습니다.');
        navigate('../list');
      },
    },
  });

  const { mutate: validateModel, isPending: isValidating } = useValidateModel({
    mutationOptions: {
      onSuccess: (data) => {
        setValidationStatus('success');
        setAvailableModels(data ?? []);
        setSelectedModelIds([]);
        toast.success('검증에 성공하였습니다.');
      },
      onError: (error) => {
        Log.warn('validation failed', error);
        setValidationStatus('error');
        // axios HTTP 에러는 apiClient가 자동으로 toast 처리, 수동 throw(FAIL 케이스)만 별도 toast
        if (!(error as { response?: unknown }).response) {
          toast.error(error.message);
        }
      },
    },
  });

  const steps = [{ title: 'Provider 설정' }, { title: '모델 선택' }];

  const handleValidate = async () => {
    try {
      const requiredFields: string[] = ['modelType', 'modelName'];
      if (!NO_API_KEY_PROVIDERS.includes(selectedProvider)) requiredFields.push('apiKey');
      await form.validateFields(requiredFields);
      const values = form.getFieldsValue();
      validateModel({ modelType: values.modelType, modelName: values.modelName, apiKey: values.apiKey ?? '' });
    } catch (error) {
      Log.warn('validation failed', error);
    }
  };

  const handleNext = async () => {
    try {
      const requiredFields: string[] = ['modelType', 'modelName'];
      if (!NO_API_KEY_PROVIDERS.includes(selectedProvider)) requiredFields.push('apiKey');
      await form.validateFields(requiredFields);
      if (validationStatus !== 'success') {
        handleValidate();
        return;
      }
      setCurrentStep(1);
    } catch (error) {
      Log.warn('step1 validation failed', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(0);
  };

  const handleSubmit = () => {
    if (!selectedModelIds.length) return;
    const values = form.getFieldsValue();
    createModel({
      modelName: values.modelName,
      modelType: values.modelType,
      apiKey: values.apiKey,
      modelVersions: selectedModelIds.map((id) => ({ id, name: id })),
    });
  };

  const handleProviderSelect = (key: string) => {
    setSelectedProvider(key);
    form.setFieldValue('modelType', key);
    setValidationStatus('idle');
    setAvailableModels([]);
    setSelectedModelIds([]);
  };

  function renderStep1() {
    return (
      <div className="max-w-2xl">
        <Form.Item name="modelType" label="서비스 프로바이더" required rules={[{ required: true, message: '프로바이더를 선택해 주세요.' }]}>
          <div className="grid grid-cols-3 gap-3">
            {PROVIDERS.map(({ key, label, icon: Icon, bg }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleProviderSelect(key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedProvider === key ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className="size-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </button>
            ))}
          </div>
        </Form.Item>

        <Row gutter={20}>
          <Col span={16}>
            <Form.Item name="modelName" label="모델 그룹명" required rules={[{ required: true, message: '모델 그룹명을 입력해 주세요.' }]}>
              <Input placeholder="예) Production_Fleet_01" />
            </Form.Item>
          </Col>
        </Row>

        {!NO_API_KEY_PROVIDERS.includes(selectedProvider) && (
          <Row gutter={20}>
            <Col span={16}>
              <Form.Item name="apiKey" label="API Key" required rules={[{ required: true, message: 'API Key를 입력해 주세요.' }]}>
                <Input.Password placeholder="API Key를 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
        )}
      </div>
    );
  }

  function renderStep2() {
    const provider = PROVIDERS.find((p) => p.key === selectedProvider);
    const Icon = provider?.icon ?? Zap;

    return (
      <>
        {availableModels.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <span className="text-sm">API 연결 후 사용 가능한 모델 목록이 표시됩니다.</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">사용할 모델을 선택하세요.</span>
              <span className="text-xs text-gray-400">
                {selectedModelIds.length} / {availableModels.length} 선택됨
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {availableModels.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModelIds.includes(model.id) ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedModelIds((prev) => (prev.includes(model.id) ? prev.filter((id) => id !== model.id) : [...prev, model.id]));
                  }}
                >
                  <Checkbox checked={selectedModelIds.includes(model.id)} onClick={(e) => e.stopPropagation()} />
                  <div className={`w-8 h-8 rounded-md ${provider?.bg ?? 'bg-gray-400'} flex items-center justify-center shrink-0`}>
                    <Icon className="size-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{model.id}</p>
                    {model.owned_by && <p className="text-xs text-gray-400">{model.owned_by}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  function renderSummary() {
    const values = form.getFieldsValue();
    const provider = PROVIDERS.find((p) => p.key === selectedProvider);

    const renderIcon = (valid: boolean) => (valid ? <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" /> : <X className="w-4 h-4 text-red-500 ml-2 shrink-0" />);

    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">프로바이더</span>
          <span className="text-gray-800 flex-1">{displayValue(provider?.label)}</span>
          {renderIcon(!!selectedProvider)}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">모델 그룹명</span>
          <span className="text-gray-800 flex-1 truncate">{displayValue(values.modelName)}</span>
          {renderIcon(!!values.modelName)}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">API Key</span>
          <span className="text-gray-800 flex-1">{values.apiKey ? '••••••••' : <span className="text-gray-300">-</span>}</span>
          {renderIcon(!!values.apiKey)}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">연결 상태</span>
          <span className={`flex-1 font-medium ${validationStatus === 'success' ? 'text-green-600' : validationStatus === 'error' ? 'text-red-500' : 'text-gray-300'}`}>
            {validationStatus === 'success' ? '검증 완료' : validationStatus === 'error' ? '검증 실패' : '-'}
          </span>
          {renderIcon(validationStatus === 'success')}
        </div>
        {currentStep === 1 && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">선택 모델</span>
            <span className="text-gray-800 flex-1">{selectedModelIds.length > 0 ? `${selectedModelIds.length}개` : <span className="text-gray-300">-</span>}</span>
            {renderIcon(selectedModelIds.length > 0)}
          </div>
        )}
      </div>
    );
  }

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
        {currentStep === 0 && (
          <>
            <Col>
              <Button variant="outlined" color="primary" onClick={handleValidate} loading={isValidating}>
                검증
              </Button>
            </Col>
            <Col>
              <Button variant="solid" color="primary" onClick={handleNext} disabled={validationStatus !== 'success'}>
                다음
              </Button>
            </Col>
          </>
        )}
        {currentStep === 1 && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmit} disabled={!selectedModelIds.length} loading={isCreating}>
              추가
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
            <Form form={form} layout="vertical">
              <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>{renderStep1()}</div>
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }} className="relative min-h-64">
                {renderStep2()}
              </div>
            </Form>
          </div>
          <div className="w-full px-7 pb-7 pt-4">{renderFooter()}</div>
        </div>
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderSummary()}</div>
        </div>
      </div>
    </div>
  );
}
