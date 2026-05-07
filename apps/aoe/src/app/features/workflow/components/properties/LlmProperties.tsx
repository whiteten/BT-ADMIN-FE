import { Collapse, Form, Input, InputNumber, Select, Slider } from 'antd';
import { useGetModels } from '../../../agent-config/hooks/useModelQueries';

const PROMPT_NAME_SYSTEM = ['data', 'systemPrompt'];
const PROMPT_NAME_USER = ['data', 'userPrompt'];

const buildModelLabel = (modelTypeName: string | undefined, modelName: string | undefined) => (modelTypeName ? `[${modelTypeName}] ${modelName ?? ''}` : (modelName ?? ''));

export default function LlmProperties() {
  const form = Form.useFormInstance();
  const { data: models = [], isLoading: isLoadingModels } = useGetModels();

  // form 의 현재 값 (Form.useWatch 로 reactive)
  const currentModelId = Form.useWatch(['data', 'modelId'], form) as string | undefined;
  const currentModelName = Form.useWatch(['data', 'modelName'], form) as string | undefined;
  const currentModelTypeName = Form.useWatch(['data', 'modelTypeName'], form) as string | undefined;

  const baseOptions = models.map((m) => ({
    label: buildModelLabel(m.modelTypeName, m.modelName),
    value: m.modelId,
  }));

  // 로딩 중이거나 list 에 없는 모델이 선택되어 있으면 fallback option 을 추가해 깜박임 방지
  const hasCurrentInList = !!currentModelId && models.some((m) => m.modelId === currentModelId);
  const modelOptions =
    currentModelId && !hasCurrentInList
      ? [{ label: buildModelLabel(currentModelTypeName, currentModelName ?? currentModelId), value: currentModelId }, ...baseOptions]
      : baseOptions;

  // 모델 선택 시 modelName / modelTypeName 도 form 에 같이 저장 (다음 진입 시 fallback 으로 활용)
  const handleModelChange = (value: string) => {
    const selected = models.find((m) => m.modelId === value);
    form.setFieldValue(['data', 'modelName'], selected?.modelName);
    form.setFieldValue(['data', 'modelTypeName'], selected?.modelTypeName);
  };

  return (
    <Collapse
      defaultActiveKey={['model', 'prompt', 'output']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={[
        {
          key: 'basic',
          label: <span className="text-sm font-semibold text-gray-800">기본 정보</span>,
          children: (
            <>
              <Form.Item name="nodeLabel" label="노드 이름" rules={[{ max: 100, message: '100자 이내여야 합니다.' }]}>
                <Input placeholder="LLM" />
              </Form.Item>
              <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이내여야 합니다.' }]}>
                <Input.TextArea placeholder="노드에 대한 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'model',
          label: <span className="text-sm font-semibold text-gray-800">모델 설정</span>,
          children: (
            <>
              {/* hidden: 모델 선택 시 자동 채우는 보조 필드 (form 에 등록되어야 onValuesChange 의 allValues 에 포함됨) */}
              <Form.Item name={['data', 'modelName']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['data', 'modelTypeName']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['data', 'modelId']} label="LLM 모델" required rules={[{ required: true, message: '모델을 선택해 주세요.' }]}>
                <Select
                  showSearch
                  loading={isLoadingModels}
                  placeholder="모델을 선택하세요."
                  options={modelOptions}
                  onChange={handleModelChange}
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
              <Form.Item name={['data', 'maxTokens']} label="최대 토큰">
                <InputNumber min={1} max={32000} step={100} className="!w-full" placeholder="7000" />
              </Form.Item>
              <Form.Item name={['data', 'temperature']} label="Temperature" extra="0 = 결정적, 2 = 매우 창의적">
                <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'prompt',
          label: <span className="text-sm font-semibold text-gray-800">프롬프트</span>,
          children: (
            <>
              <Form.Item name={PROMPT_NAME_SYSTEM} label="System 프롬프트" extra="모델의 역할·행동 지침">
                <Input.TextArea placeholder="시스템 프롬프트를 입력하세요." autoSize={{ minRows: 3, maxRows: 8 }} />
              </Form.Item>
              <Form.Item name={PROMPT_NAME_USER} label="User 프롬프트 템플릿" extra="이전 노드의 출력 변수를 {{user_input_result}} 형태로 참조 가능">
                <Input.TextArea placeholder="사용자 프롬프트를 입력하세요." autoSize={{ minRows: 3, maxRows: 8 }} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'output',
          label: <span className="text-sm font-semibold text-gray-800">출력</span>,
          children: (
            <Form.Item
              name={['data', 'outputVariable']}
              label="출력 변수명"
              extra="다음 노드에서 {변수명}_result 로 참조"
              rules={[{ pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '영문/숫자/언더스코어만, 숫자로 시작 불가' }]}
            >
              <Input placeholder="llm_answer" />
            </Form.Item>
          ),
        },
      ]}
    />
  );
}
