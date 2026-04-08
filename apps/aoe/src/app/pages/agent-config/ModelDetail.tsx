import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, Input, InputNumber, Row, Steps, Switch } from 'antd';
import { Brain, Check, Cpu, type LucideIcon, Server, Sparkles, Wand2, X, Zap } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useDeleteModel, useGetModel, useUpdateModel } from '../../features/agent-config/hooks/useModelQueries';
import type { ModelDetailItem, ModelDetailUpdateDatas } from '../../features/agent-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

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

const getProvider = (modelType?: string): ProviderConfig => {
  if (!modelType) return { key: '', label: '-', icon: Zap, bg: 'bg-gray-400' };
  return PROVIDERS.find((p) => modelType.toLowerCase().includes(p.key)) ?? { key: '', label: modelType, icon: Zap, bg: 'bg-gray-400' };
};

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

export default function ModelDetail() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm<{ modelName: string; useYn: 0 | 1 }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [detailChanges, setDetailChanges] = useState<Record<string, ModelDetailUpdateDatas>>({});

  const { data: model, isFetching: isFetchingModel } = useGetModel({ params: { modelId } });
  const provider = getProvider(model?.modelTypeName ?? model?.modelType);
  const details = model?.details;

  const { mutate: deleteModel } = useDeleteModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 삭제되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteModel failed', error),
    },
  });

  const { mutate: updateModel, isPending: isUpdating } = useUpdateModel({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModel({ modelId }).queryKey });
        toast.success('저장되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('updateModel failed', error),
    },
  });

  useEffect(() => {
    if (!model) return;
    form.setFieldsValue({ modelName: model.modelName, useYn: model.useYn ?? 0 });
  }, [model, form]);

  // step2 진입 시 변경 초기화
  useEffect(() => {
    if (currentStep === 1) setDetailChanges({});
  }, [currentStep]);

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '관리', path: '/aoe/agent-config' },
    { title: 'AI 모델', path: '/aoe/agent-config/model/list' },
    { title: ':modelName', path: `/aoe/agent-config/model/${modelId}` },
  ];

  const params: BreadcrumbProps['params'] = { modelName: model?.modelName ?? '-' };

  const getDetailValue = (record: ModelDetailItem): ModelDetailUpdateDatas => ({
    detailId: record.detailId,
    useYn: detailChanges[record.detailId]?.useYn ?? record.useYn,
    costPerInputToken: detailChanges[record.detailId]?.costPerInputToken ?? record.costPerInputToken,
    costPerOutputToken: detailChanges[record.detailId]?.costPerOutputToken ?? record.costPerOutputToken,
  });

  const handleToggleUseYn = (record: ModelDetailItem) => {
    const current = getDetailValue(record);
    setDetailChanges((prev) => ({
      ...prev,
      [record.detailId]: { ...current, useYn: current.useYn === 1 ? 0 : 1 },
    }));
  };

  const handleCostChange = (record: ModelDetailItem, field: 'costPerInputToken' | 'costPerOutputToken', value: number | null) => {
    const current = getDetailValue(record);
    setDetailChanges((prev) => ({
      ...prev,
      [record.detailId]: { ...current, [field]: value ?? undefined },
    }));
  };

  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => {
        if (modelId) deleteModel({ modelId });
      },
    });
  };

  const handleNext = async () => {
    try {
      await form.validateFields(['modelName']);
      setCurrentStep(1);
    } catch (error) {
      Log.warn('step1 validation failed', error);
    }
  };

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const modelVersions = details?.map((d) => ({
          id: d.detailId,
          name: d.modelVersion,
          useYn: detailChanges[d.detailId]?.useYn ?? d.useYn,
          costPerInputToken: detailChanges[d.detailId]?.costPerInputToken ?? d.costPerInputToken,
          costPerOutputToken: detailChanges[d.detailId]?.costPerOutputToken ?? d.costPerOutputToken,
        }));
        if (modelId) updateModel({ modelId, modelName: values.modelName, useYn: values.useYn, modelVersions });
      })
      .catch(Log.warn);
  };

  const steps = [{ title: '기본 설정' }, { title: '모델 버전' }];

  const renderIcon = (valid: boolean) => (valid ? <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" /> : <X className="w-4 h-4 text-red-500 ml-2 shrink-0" />);

  function renderSummary() {
    const values = form.getFieldsValue();
    const activeCount = details?.filter((d) => d.useYn === 1).length ?? 0;

    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">프로바이더</span>
          <span className="text-gray-800 flex-1">{displayValue(provider.label !== '-' ? provider.label : undefined)}</span>
          {renderIcon(provider.label !== '-')}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">모델 그룹명</span>
          <span className="text-gray-800 flex-1 truncate">{displayValue(values.modelName)}</span>
          {renderIcon(!!values.modelName)}
        </div>
        {currentStep === 1 && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">활성 모델</span>
            <span className="text-gray-800 flex-1">{activeCount > 0 ? `${activeCount}개` : <span className="text-gray-300">-</span>}</span>
            {renderIcon(activeCount > 0)}
          </div>
        )}
      </div>
    );
  }

  function renderStep1() {
    if (isFetchingModel) {
      return (
        <div className="flex items-center justify-center h-48">
          <FallbackSpinner />
        </div>
      );
    }

    return (
      <>
        <Row gutter={20}>
          <Col>
            <Form.Item label="서비스 프로바이더">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/5 w-fit">
                <div className={`w-9 h-9 rounded-md ${provider.bg} flex items-center justify-center`}>
                  <provider.icon className="size-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-800">{provider.label}</span>
              </div>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={8}>
            <Form.Item name="modelName" label="모델 그룹명" required rules={[{ required: true, message: '모델 그룹명을 입력해 주세요.' }]}>
              <Input placeholder="모델 그룹명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={8}>
            <Form.Item name="useYn" label="활성화 여부" valuePropName="checked" getValueProps={(value) => ({ checked: value === 1 })} normalize={(value) => (value ? 1 : 0)}>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  function renderStep2() {
    if (isFetchingModel) {
      return (
        <div className="flex items-center justify-center h-48">
          <FallbackSpinner />
        </div>
      );
    }

    if (!details?.length) {
      return <NoData message="등록된 모델 버전이 없습니다." iconSize={40} fontSize="text-base" gap={2} />;
    }

    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            모델 버전 <span className="text-gray-400 font-normal">({details.length}개)</span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {details.map((detail) => (
            <div
              key={detail.detailId}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-all ${
                getDetailValue(detail).useYn === 1 ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/5' : 'border-gray-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-md ${provider.bg} flex items-center justify-center shrink-0`}>
                <provider.icon className="size-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{detail.modelVersion}</p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-400 mr-1">INPUT</span>
                <InputNumber
                  defaultValue={detail.costPerInputToken}
                  min={0}
                  step={0.000001}
                  precision={6}
                  placeholder="0.000000"
                  style={{ width: 160 }}
                  onChange={(value) => handleCostChange(detail, 'costPerInputToken', value)}
                />
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-400 mr-1">OUTPUT</span>
                <InputNumber
                  defaultValue={detail.costPerOutputToken}
                  min={0}
                  step={0.000001}
                  precision={6}
                  placeholder="0.000000"
                  style={{ width: 160 }}
                  onChange={(value) => handleCostChange(detail, 'costPerOutputToken', value)}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-400 mr-1">활성화</span>
                <Switch checked={getDetailValue(detail).useYn === 1} onChange={() => handleToggleUseYn(detail)} />
              </div>
            </div>
          ))}
        </div>
      </>
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
        <Col>
          <Button color="danger" variant="solid" onClick={handleDelete}>
            삭제
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={() => setCurrentStep(0)}>
              이전
            </Button>
          </Col>
        )}
        {currentStep === 0 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {currentStep === 1 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleSave} loading={isUpdating}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} params={params} />
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
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">수정 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderSummary()}</div>
        </div>
      </div>
    </div>
  );
}
