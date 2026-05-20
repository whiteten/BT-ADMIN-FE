import { Collapse, Form, Input } from 'antd';
import type { FlowNode } from '../../types';

interface ErrorPropertiesProps {
  node: FlowNode;
}

/**
 * 오류 노드 properties.
 * AS-IS 데이터 구조: `{ errorMessage: string }`
 * 실행 시 워크플로우가 중단되고 errorMessage 가 반환된다.
 */
export default function ErrorProperties({ node: _node }: ErrorPropertiesProps) {
  return (
    <Collapse
      defaultActiveKey={['error']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={[
        {
          key: 'error',
          label: <span className="text-sm font-semibold text-gray-800">오류 메시지</span>,
          children: (
            <Form.Item
              name={['data', 'errorMessage']}
              label="메시지"
              extra="이 노드가 실행되면 워크플로우가 중단되고 이 메시지가 반환됩니다."
              rules={[{ required: true, message: '오류 메시지를 입력해 주세요.' }]}
            >
              <Input.TextArea placeholder="처리를 진행할 수 없습니다." autoSize={{ minRows: 3, maxRows: 8 }} />
            </Form.Item>
          ),
        },
      ]}
    />
  );
}
