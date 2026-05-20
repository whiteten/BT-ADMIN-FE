import { Checkbox, Collapse, Form, Input, Radio, Select } from 'antd';
import OutputVariableNotice from './OutputVariableNotice';
import VariableTextArea from './VariableTextArea';
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
                  <Form.Item name={['data', 'openai_moderation', 'model']} label="모델">
                    <Input placeholder="omni-moderation-latest" />
                  </Form.Item>
                  <Form.Item name={['data', 'openai_moderation', 'api_key']} label="API Key">
                    <Input.Password placeholder="sk-..." />
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
