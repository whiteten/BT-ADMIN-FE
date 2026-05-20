import { Collapse, Form, Input, Select } from 'antd';
import OutputVariableNotice from './OutputVariableNotice';
import { useGetA2AList } from '../../../a2a/hooks/useA2aQueries';
import type { FlowNode } from '../../types';

interface A2APropertiesProps {
  node: FlowNode;
}

export default function A2AProperties({ node }: A2APropertiesProps) {
  const form = Form.useFormInstance();
  const { data: a2aList = [], isLoading } = useGetA2AList();

  const currentA2aId = Form.useWatch(['data', 'a2aId'], form) as string | undefined;
  const currentAgentName = Form.useWatch(['data', 'agentName'], form) as string | undefined;

  const baseOptions = a2aList.map((a) => ({
    label: a.agentName,
    value: a.a2aId,
  }));
  const hasInList = !!currentA2aId && a2aList.some((a) => a.a2aId === currentA2aId);
  const a2aOptions = currentA2aId && !hasInList ? [{ label: currentAgentName ?? currentA2aId, value: currentA2aId }, ...baseOptions] : baseOptions;

  // A2A Agent 선택 시 agentId / agentName / description 자동 채움
  const handleA2AChange = (value: string) => {
    const selected = a2aList.find((a) => a.a2aId === value);
    if (!selected) return;
    form.setFieldValue(['data', 'agentId'], selected.agentId);
    form.setFieldValue(['data', 'agentName'], selected.agentName);
    if (selected.agentDescription !== undefined) {
      form.setFieldValue(['data', 'a2aDescription'], selected.agentDescription);
    }
  };

  return (
    <Collapse
      defaultActiveKey={['a2a', 'output']}
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
                <Input placeholder="A2A" />
              </Form.Item>
              <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이내여야 합니다.' }]}>
                <Input.TextArea placeholder="노드에 대한 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'a2a',
          label: <span className="text-sm font-semibold text-gray-800">A2A 설정</span>,
          children: (
            <>
              {/* hidden: A2A 선택 시 자동 채우는 보조 필드 */}
              <Form.Item name={['data', 'agentId']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['data', 'agentName']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['data', 'a2aId']} label="A2A Agent" required rules={[{ required: true, message: 'A2A Agent를 선택해 주세요.' }]}>
                <Select
                  showSearch
                  loading={isLoading}
                  placeholder="Agent를 선택하세요."
                  options={a2aOptions}
                  onChange={handleA2AChange}
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
              <Form.Item name={['data', 'a2aDescription']} label="Agent 설명">
                <Input.TextArea placeholder="선택된 Agent 의 설명" autoSize={{ minRows: 2, maxRows: 4 }} disabled />
              </Form.Item>
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
              description="A2A 응답"
            />
          ),
        },
      ]}
    />
  );
}
