import { Checkbox, Collapse, Form, Input, Radio, Select } from 'antd';
import OutputVariableNotice from './OutputVariableNotice';
import VariableTextArea from './VariableTextArea';
import { useGetModels } from '../../../agent-config/hooks/useModelQueries';
import type { FlowNode, WorkflowGraph } from '../../types';
import { getUpstreamVariables } from '../../utils/variableTokens';

const SENSITIVITY_OPTIONS = [
  { label: '낮음', value: 'low' },
  { label: '중간', value: 'medium' },
  { label: '높음', value: 'high' },
];

const OPENAI_CATEGORIES = [
  { label: '성적 (sexual)', value: 'sexual' },
  { label: '괴롭힘 (harassment)', value: 'harassment' },
  { label: '혐오 (hate)', value: 'hate' },
  { label: '불법 (illicit)', value: 'illicit' },
  { label: '자해 (self-harm)', value: 'self-harm' },
  { label: '폭력 (violence)', value: 'violence' },
];

const PII_ENTITY_OPTIONS = [
  { label: '이메일', value: 'EMAIL_ADDRESS' },
  { label: '전화번호', value: 'PHONE_NUMBER' },
  { label: 'IP 주소', value: 'IP_ADDRESS' },
  { label: 'URL', value: 'URL' },
  { label: '신용카드', value: 'CREDIT_CARD' },
  { label: '계좌번호', value: 'BANK_ACCOUNT' },
];

interface GuardrailPropertiesProps {
  node: FlowNode;
  graph: WorkflowGraph;
}

export default function GuardrailProperties({ node, graph }: GuardrailPropertiesProps) {
  const form = Form.useFormInstance();
  const moderationType = (Form.useWatch(['data', 'moderation_type'], form) as 'openai' | 'vllm' | undefined) ?? 'openai';
  const piiMaskMode = (Form.useWatch(['data', 'pii_regex', 'masking', 'mode'], form) as 'mask_char' | 'replace_with_tag' | undefined) ?? 'mask_char';
  const variables = getUpstreamVariables(node.nodeId, graph);

  // OpenAI moderation 모델 — 등록 모델 버전 중 이름에 'moderation' 이 포함된 것만 노출.
  // 선택 시 model(버전 문자열) + api_key(소속 모델의 등록 키)를 함께 form 에 채워 BE 페이로드에 싣는다.
  // (api_key 는 화면에 입력란을 두지 않고 hidden 으로만 보관 — 선택 모델이 자체 키를 가지므로 운영자가 직접 입력할 필요 없음)
  const { data: models = [], isLoading: isLoadingModels } = useGetModels();
  const currentModerationModel = Form.useWatch(['data', 'openai_moderation', 'model'], form) as string | undefined;
  const moderationApiKeyByModel = new Map<string, string>();
  const moderationModelOptions = models.flatMap((m) =>
    (m.details ?? [])
      .filter((d) => d.modelVersion.toLowerCase().includes('moderation'))
      .map((d) => {
        moderationApiKeyByModel.set(d.modelVersion, m.apiKey ?? '');
        return { label: d.modelVersion, value: d.modelVersion };
      }),
  );
  // 현재 저장값이 목록에 없으면(로딩 중·삭제된 모델) fallback option 을 추가해 선택 표시 유지
  const hasCurrentModeration = !!currentModerationModel && moderationModelOptions.some((o) => o.value === currentModerationModel);
  const moderationOptions =
    currentModerationModel && !hasCurrentModeration ? [{ label: currentModerationModel, value: currentModerationModel }, ...moderationModelOptions] : moderationModelOptions;

  // Ant Form 의 setFieldValue 는 onValuesChange 를 트리거하지 않으므로 마지막에 form.submit() 으로 부모 자동 저장(onFinish)을 강제 실행
  const handleModerationModelChange = (value: string) => {
    form.setFieldValue(['data', 'openai_moderation', 'model'], value);
    form.setFieldValue(['data', 'openai_moderation', 'api_key'], moderationApiKeyByModel.get(value) ?? '');
    form.submit();
  };

  return (
    <Collapse
      defaultActiveKey={['moderation', 'pii', 'output']}
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
                <Input placeholder="가드레일" />
              </Form.Item>
              <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이내여야 합니다.' }]}>
                <Input.TextArea placeholder="노드에 대한 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'moderation',
          label: <span className="text-sm font-semibold text-gray-800">유해 차단 필터</span>,
          children: (
            <>
              <Form.Item name={['data', 'moderation_type']} label="Moderation 유형" initialValue="openai">
                <Radio.Group
                  options={[
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'vLLM', value: 'vllm' },
                  ]}
                />
              </Form.Item>

              {moderationType === 'openai' && (
                <>
                  {/* model 은 Select 로 선택, api_key 는 선택 모델의 등록 키로 자동 채움 — 둘 다 hidden 으로 form 에 보관해 BE 에 전송 */}
                  <Form.Item name={['data', 'openai_moderation', 'model']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={['data', 'openai_moderation', 'api_key']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="모델">
                    <Select
                      showSearch
                      loading={isLoadingModels}
                      placeholder="omni-moderation-latest"
                      value={currentModerationModel}
                      options={moderationOptions}
                      onChange={handleModerationModelChange}
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                  </Form.Item>
                  <Form.Item name={['data', 'openai_moderation', 'moderation_sensitivity']} label="민감도" initialValue="high">
                    <Select options={SENSITIVITY_OPTIONS} />
                  </Form.Item>
                  <Form.Item name={['data', 'openai_moderation', 'categories']} label="감지 카테고리">
                    <Checkbox.Group options={OPENAI_CATEGORIES} className="grid grid-cols-2 gap-1" />
                  </Form.Item>
                  <Form.Item name={['data', 'openai_moderation', 'behavior', 'user_message_template']} label="차단 메시지" extra="`/` 입력 시 변수 dropdown">
                    <VariableTextArea variables={variables} placeholder="요청을 처리할 수 없습니다." rows={2} />
                  </Form.Item>
                </>
              )}

              {moderationType === 'vllm' && (
                <>
                  <Form.Item name={['data', 'vllm_moderation', 'endpoint']} label="vLLM Endpoint" required rules={[{ required: true, message: 'Endpoint 를 입력하세요.' }]}>
                    <Input placeholder="http://..." />
                  </Form.Item>
                  <Form.Item name={['data', 'vllm_moderation', 'model']} label="모델명" required rules={[{ required: true, message: '모델명을 입력하세요.' }]}>
                    <Input placeholder="모델명" />
                  </Form.Item>
                  <Form.Item name={['data', 'vllm_moderation', 'moderation_sensitivity']} label="민감도" initialValue="high">
                    <Select options={SENSITIVITY_OPTIONS} />
                  </Form.Item>
                  <Form.Item name={['data', 'vllm_moderation', 'categories']} label="감지 카테고리">
                    <Checkbox.Group options={OPENAI_CATEGORIES} className="grid grid-cols-2 gap-1" />
                  </Form.Item>
                  <Form.Item name={['data', 'vllm_moderation', 'behavior', 'user_message_template']} label="차단 메시지" extra="`/` 입력 시 변수 dropdown">
                    <VariableTextArea variables={variables} placeholder="요청을 처리할 수 없습니다." rows={2} />
                  </Form.Item>
                </>
              )}
            </>
          ),
        },
        {
          key: 'pii',
          label: <span className="text-sm font-semibold text-gray-800">PII (개인정보)</span>,
          children: (
            <>
              <Form.Item name={['data', 'pii_regex', 'entities']} label="감지 항목">
                <Checkbox.Group options={PII_ENTITY_OPTIONS} className="grid grid-cols-2 gap-1" />
              </Form.Item>
              <Form.Item name={['data', 'pii_regex', 'masking', 'mode']} label="마스킹 방식" initialValue="mask_char">
                <Radio.Group
                  options={[
                    { label: '문자 마스킹', value: 'mask_char' },
                    { label: '태그 치환', value: 'replace_with_tag' },
                  ]}
                />
              </Form.Item>
              {piiMaskMode === 'mask_char' && (
                <Form.Item name={['data', 'pii_regex', 'masking', 'mask_char']} label="마스킹 문자" initialValue="*">
                  <Input maxLength={1} className="!w-20" />
                </Form.Item>
              )}
            </>
          ),
        },
        {
          key: 'output',
          label: <span className="text-sm font-semibold text-gray-800">출력</span>,
          children: (
            <OutputVariableNotice
              nodeId={node.nodeId}
              nodeLabel={node.nodeLabel}
              nodeKind={node.nodeKind}
              outputVariable={node.data?.output_variable as string | undefined}
              dataType="string"
              description="가드레일 결과"
            />
          ),
        },
      ]}
    />
  );
}
