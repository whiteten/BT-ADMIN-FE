import { Collapse, Form, Input } from 'antd';
import StartVariablesEditor from './StartVariablesEditor';
import type { FlowNode } from '../../types';

interface BasicPropertiesProps {
  node: FlowNode;
}

export default function BasicProperties({ node }: BasicPropertiesProps) {
  const kind = node.nodeKind;

  const basicChildren = (
    <>
      <Form.Item name="nodeLabel" label="노드 이름" rules={[{ max: 100, message: '100자 이내여야 합니다.' }]}>
        <Input placeholder="라벨" />
      </Form.Item>
      <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이내여야 합니다.' }]}>
        <Input.TextArea placeholder="노드 설명" autoSize={{ minRows: 2, maxRows: 5 }} />
      </Form.Item>
    </>
  );

  const items = [
    {
      key: 'basic',
      label: <span className="text-sm font-semibold text-gray-800">기본 정보</span>,
      children: basicChildren,
    },
  ];

  if (kind === 'start') {
    items.push({
      key: 'variables',
      label: <span className="text-sm font-semibold text-gray-800">사용자 입력 변수</span>,
      children: (
        <Form.Item name={['data', 'variables']} noStyle>
          <StartVariablesEditor />
        </Form.Item>
      ),
    });
    items.push({
      key: 'system',
      label: <span className="text-sm font-semibold text-gray-800">시작 메시지</span>,
      children: (
        <Form.Item name={['data', 'welcomeMessage']} label="메시지" extra="워크플로우 진입 시 사용자에게 표시">
          <Input.TextArea placeholder="안녕하세요, 무엇을 도와드릴까요?" autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
      ),
    });
  }

  if (kind === 'error') {
    items.push({
      key: 'error',
      label: <span className="text-sm font-semibold text-gray-800">오류 메시지</span>,
      children: (
        <Form.Item name={['data', 'errorMessage']} label="메시지" extra="이 노드에 도달했을 때 출력할 오류 메시지">
          <Input.TextArea placeholder="오류가 발생했습니다." autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
      ),
    });
  }

  // 기본정보(basic) 외 섹션이 있으면 그것만 기본 펼침. 단독 'basic' 만 있으면 그것을 펼침
  const defaultActiveKey = items.length > 1 ? items.filter((i) => i.key !== 'basic').map((i) => i.key) : items.map((i) => i.key);

  return <Collapse defaultActiveKey={defaultActiveKey} ghost expandIconPosition="end" className="aoe-properties-collapse" items={items} />;
}
