import { Button, Collapse, Form, Input } from 'antd';
import { FileCode2 } from 'lucide-react';
import OutputVariableNotice from './OutputVariableNotice';
import type { FlowNode } from '../../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface CodePropertiesProps {
  node: FlowNode;
}

const DEFAULT_PYTHON_TEMPLATE = `import json

# input 은 이전 노드의 결과가 자동으로 들어옵니다.
if isinstance(input, str):
    try:
        obj = json.loads(input)
    except json.JSONDecodeError:
        return input
elif isinstance(input, dict):
    obj = input
else:
    return str(input)

# 출력은 String 타입 1건만 리턴 가능합니다.
return obj.get('data', '')`;

/**
 * Code 노드 properties.
 * AS-IS 데이터 구조: `{ code: string }` (Python).
 * BE 가 코드를 실행 — input 변수에 이전 노드 결과 주입, return 값이 output.
 * 신택스 하이라이트는 후속 단계 (현재는 monospace textarea 만)
 */
export default function CodeProperties({ node }: CodePropertiesProps) {
  const form = Form.useFormInstance();
  const modal = useModal();
  const currentCode = (Form.useWatch(['data', 'code'], form) as string | undefined) ?? '';

  const applyTemplate = () => {
    form.setFieldValue(['data', 'code'], DEFAULT_PYTHON_TEMPLATE);
    // setFieldValue 는 onValuesChange 를 발화하지 않으므로 자동 저장을 위해 직접 submit
    form.submit();
  };

  const handleLoadTemplate = () => {
    if (!currentCode.trim()) {
      applyTemplate();
      return;
    }
    modal.confirm.execute({
      onOk: applyTemplate,
      options: {
        title: '템플릿 가져오기',
        content: '기존 코드를 템플릿으로 덮어씁니다. 계속하시겠습니까?',
        okText: '덮어쓰기',
        cancelText: '취소',
      },
    });
  };

  return (
    <Collapse
      defaultActiveKey={['code', 'output']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={[
        {
          key: 'code',
          label: <span className="text-sm font-semibold text-gray-800">Python 코드</span>,
          children: (
            <>
              <div className="flex justify-end mb-2">
                <Button size="small" type="dashed" icon={<FileCode2 size={12} />} onClick={handleLoadTemplate}>
                  템플릿 가져오기
                </Button>
              </div>
              <Form.Item
                name={['data', 'code']}
                label="코드"
                extra="이전 노드 결과는 input 변수로 주입됩니다. return 값이 출력으로 사용됩니다."
                rules={[{ required: true, message: '실행할 코드를 입력해 주세요.' }]}
              >
                <Input.TextArea autoSize={{ minRows: 8, maxRows: 24 }} style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', fontSize: 13 }} />
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
              description="코드 실행 결과"
            />
          ),
        },
      ]}
    />
  );
}
