import { Collapse, Form, Input, Switch } from 'antd';
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
    items.push({
      key: 'chatMemory',
      label: <span className="text-sm font-semibold text-gray-800">대화 메모리 설정</span>,
      children: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800">Chat 메모리</div>
              <div className="text-[12px] text-gray-500 mt-0.5">이전 대화 내용을 기억하고 맥락을 유지합니다</div>
            </div>
            <Form.Item name={['data', 'chatMemoryYn']} valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.data?.chatMemoryYn !== cur.data?.chatMemoryYn}>
            {({ getFieldValue }) =>
              getFieldValue(['data', 'chatMemoryYn']) ? (
                <div className="rounded bg-blue-50 text-[12px] text-gray-600 p-2 mt-3">
                  <span className="font-semibold text-[var(--color-bt-primary)]">활성화됨:</span> 대화 내용이 저장되어 이전 대화 맥락을 기반으로 응답합니다.
                </div>
              ) : (
                <div className="rounded bg-gray-50 text-[12px] text-gray-600 p-2 mt-3">
                  <span className="font-semibold text-gray-500">비활성화됨:</span> 각 대화를 독립적으로 처리하며 이전 대화 내용을 기억하지 않습니다.
                </div>
              )
            }
          </Form.Item>
        </>
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
