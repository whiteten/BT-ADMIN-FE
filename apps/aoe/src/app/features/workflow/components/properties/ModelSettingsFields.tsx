import { Form, Input, InputNumber, Select, Slider } from 'antd';
import { useGetModels } from '../../../agent-config/hooks/useModelQueries';

const buildOptionLabel = (modelTypeName: string | undefined, version: string | undefined) => (modelTypeName ? `[${modelTypeName}] ${version ?? ''}` : (version ?? ''));

const composeModelKey = (modelId: string | undefined, version: string | undefined) => (modelId && version ? `${modelId}::${version}` : undefined);

interface ModelMeta {
  modelId: string;
  modelName: string;
  modelTypeName?: string;
  modelVersion: string;
}

/**
 * "모델 설정" 섹션 공통 필드 — LLM 모델 선택 + 최대 토큰/최대 길이/Temperature.
 * LLM 노드와 조건(prompt) 노드 properties 가 같은 form 경로(data.modelId 등)를 공유한다.
 * Form.useFormInstance() 로 부모 폼에 붙으므로 props 불필요.
 */
export default function ModelSettingsFields() {
  const form = Form.useFormInstance();
  // 패널을 다시 열 때마다 재요청하지 않도록 캐싱(5분). (모델 라벨 깜박임은 아래 fallback option 으로 별도 방지됨)
  const { data: models = [], isLoading: isLoadingModels } = useGetModels({
    queryOptions: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  });

  // form 의 현재 값 (Form.useWatch 로 reactive) — 모델 필드는 form 자체에서만 다루므로 useWatch 사용
  const currentModelId = Form.useWatch(['data', 'modelId'], form) as string | undefined;
  const currentModelVersion = Form.useWatch(['data', 'modelVersion'], form) as string | undefined;
  const currentModelName = Form.useWatch(['data', 'modelName'], form) as string | undefined;
  const currentModelTypeName = Form.useWatch(['data', 'modelTypeName'], form) as string | undefined;

  // dropdown 옵션을 모델 단위가 아닌 디테일(modelVersion) 단위로 평탄화
  // antd v6 가 표준 외 필드(modelId 등) 를 DOM 으로 흘려보내므로 옵션은 {label,value} 만 두고 메타는 별도 Map 으로 분리
  const detailMeta = new Map<string, ModelMeta>();
  const detailOptions = models.flatMap((m) =>
    (m.details ?? []).map((d) => {
      const value = `${m.modelId}::${d.modelVersion}`;
      detailMeta.set(value, { modelId: m.modelId, modelName: m.modelName, modelTypeName: m.modelTypeName, modelVersion: d.modelVersion });
      return { label: buildOptionLabel(m.modelTypeName, d.modelVersion), value };
    }),
  );

  // 현재 노드의 dropdown value (modelId::modelVersion). 옛 노드 호환: modelVersion 없으면 modelName 으로 폴백
  const currentVersionForKey = currentModelVersion ?? currentModelName;
  const currentDropdownValue = composeModelKey(currentModelId, currentVersionForKey);

  // 로딩 중이거나 list 에 없는 조합이 선택되어 있으면 fallback option 을 추가해 깜박임 방지
  const hasCurrentInList = !!currentDropdownValue && detailOptions.some((o) => o.value === currentDropdownValue);
  const modelOptions =
    currentDropdownValue && !hasCurrentInList
      ? [{ label: buildOptionLabel(currentModelTypeName, currentVersionForKey ?? currentModelId), value: currentDropdownValue }, ...detailOptions]
      : detailOptions;

  // 모델 버전 선택 시 modelId / modelVersion / modelName / modelTypeName 을 form 에 같이 저장.
  // Ant Form 의 setFieldValue 는 onValuesChange 를 트리거하지 않으므로(부모 자동 저장 흐름이 안 돌아감),
  // 마지막에 form.submit() 으로 부모 onFinish 를 강제 실행해 즉시 BE 에 반영한다.
  const handleModelChange = (value: string) => {
    const selected = detailMeta.get(value);
    if (!selected) return;
    form.setFieldValue(['data', 'modelId'], selected.modelId);
    form.setFieldValue(['data', 'modelVersion'], selected.modelVersion);
    form.setFieldValue(['data', 'modelName'], selected.modelName);
    form.setFieldValue(['data', 'modelTypeName'], selected.modelTypeName);
    form.submit();
  };

  return (
    <>
      {/* hidden: 모델 선택 시 자동 채우는 보조 필드 (form 에 등록되어야 onValuesChange 의 allValues 에 포함됨) */}
      <Form.Item name={['data', 'modelId']} hidden rules={[{ required: true, message: '모델을 선택해 주세요.' }]}>
        <Input />
      </Form.Item>
      <Form.Item name={['data', 'modelVersion']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['data', 'modelName']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['data', 'modelTypeName']} hidden>
        <Input />
      </Form.Item>
      <Form.Item label="LLM 모델" required validateStatus={!currentModelId ? 'error' : undefined} help={!currentModelId ? '모델을 선택해 주세요.' : undefined}>
        <Select
          showSearch
          loading={isLoadingModels}
          placeholder="모델 버전을 선택하세요."
          value={currentDropdownValue}
          options={modelOptions}
          onChange={handleModelChange}
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>
      <div className="grid grid-cols-2 gap-3">
        <Form.Item name={['data', 'maxTokens']} label="최대 토큰">
          <InputNumber min={1} max={32000} step={100} className="!w-full" placeholder="7000" />
        </Form.Item>
        <Form.Item name={['data', 'maxLength']} label="최대 길이">
          <InputNumber min={1} max={32000} step={50} className="!w-full" placeholder="200" />
        </Form.Item>
      </div>
      <Form.Item name={['data', 'temperature']} label="Temperature" extra="0 = 결정적, 2 = 매우 창의적">
        <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
      </Form.Item>
    </>
  );
}
