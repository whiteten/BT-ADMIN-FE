import { Button, Collapse, Form, Input, Radio, Select, Tooltip } from 'antd';
import { Info, Plus, Trash2 } from 'lucide-react';
import ModelSettingsFields from './ModelSettingsFields';
import OutputVariableNotice from './OutputVariableNotice';
import { NODE_KIND_MAP } from '../../constants/nodeKinds';
import type { FlowNode, WorkflowGraph } from '../../types';

interface ConditionPropertiesProps {
  node: FlowNode;
  graph: WorkflowGraph;
}

const CONDITION_TYPE_OPTIONS = [
  { label: 'Operator', value: 'operator' },
  { label: 'Prompt', value: 'prompt' },
];

const LOGIC_OPTIONS = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
];

// AS-IS 의 비교 연산자 라벨/값 — 한국어 그대로 사용 (BE 가 한국어 키 받음)
const OPERATOR_OPTIONS = [
  { label: '포함', value: '포함' },
  { label: '미포함', value: '미포함' },
  { label: '같음', value: '같음' },
  { label: '다름', value: '다름' },
  { label: '시작', value: '시작' },
  { label: '끝남', value: '끝남' },
  { label: '비어있음', value: '비어있음' },
  { label: '비어있지 않음', value: '비어있지 않음' },
];

const DROPDOWN_EMPTY = <div className="text-[11px] text-gray-400 px-2 py-1">먼저 조건 노드에서 다음 노드로 엣지를 연결해 주세요.</div>;

/**
 * 조건부(라우팅) 노드 properties.
 * 두 가지 모드:
 *  - operator: data.cases = [{ logic, goto, conditions: [{ option, value }] }], data.else_goto
 *  - prompt:   data.routes = [{ label, node_id }], data.fallback_node
 */
export default function ConditionProperties({ node, graph }: ConditionPropertiesProps) {
  const form = Form.useFormInstance();
  const conditionType = (Form.useWatch(['data', 'condition_type'], form) as 'operator' | 'prompt' | undefined) ?? 'operator';

  // 다음 노드 dropdown 옵션 — 이 condition 노드에서 outgoing edge 로 직접 연결된 노드만.
  const downstreamIds = new Set((graph.edges ?? []).filter((e) => e.srcNodeId === node.nodeId).map((e) => e.tgtNodeId));
  const nodeOptions = (graph.nodes ?? [])
    .filter((n) => downstreamIds.has(n.nodeId))
    .map((n) => {
      const meta = NODE_KIND_MAP[n.nodeKind];
      const kindLabel = meta?.label ?? n.nodeKind;
      const label = n.nodeLabel ? `${n.nodeLabel} (${kindLabel})` : kindLabel;
      return { label, value: n.nodeId };
    });

  const items = [
    {
      key: 'basic',
      label: <span className="text-sm font-semibold text-gray-800">기본 정보</span>,
      children: (
        <>
          <Form.Item name="nodeLabel" label="노드 이름" rules={[{ max: 100, message: '100자 이내여야 합니다.' }]}>
            <Input placeholder="조건" />
          </Form.Item>
          <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이내여야 합니다.' }]}>
            <Input.TextArea placeholder="노드에 대한 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'type',
      label: <span className="text-sm font-semibold text-gray-800">조건 타입</span>,
      children: (
        <Form.Item name={['data', 'condition_type']} label="조건 타입" initialValue="operator">
          <Radio.Group options={CONDITION_TYPE_OPTIONS} />
        </Form.Item>
      ),
    },
  ];

  if (conditionType === 'operator') {
    items.push({
      key: 'cases',
      label: <span className="text-sm font-semibold text-gray-800">조건 설정</span>,
      children: (
        <Form.List name={['data', 'cases']}>
          {(caseFields, { add: addCase, remove: removeCase }) => (
            <div className="flex flex-col gap-2">
              {caseFields.map(({ key: caseKey, name: caseName, ...restCase }) => (
                <div key={caseKey} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 flex flex-col gap-1.5">
                  {/* 헤더: IF 라벨 + 논리 연산 select + 삭제 한 줄 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-700">IF</span>
                    <Form.Item {...restCase} name={[caseName, 'logic']} initialValue="AND" className="!mb-0">
                      <Select size="small" options={LOGIC_OPTIONS} className="!w-[72px]" />
                    </Form.Item>
                    <Tooltip title="이전 노드의 출력값과 비교합니다.">
                      <Info size={12} className="text-gray-400" />
                    </Tooltip>
                    <span className="flex-1" />
                    <Button size="small" type="text" icon={<Trash2 size={12} className="text-red-500" />} onClick={() => removeCase(caseName)} />
                  </div>
                  {/* condition rows — 평탄화: 연산자 + 값 한 줄 */}
                  <Form.List name={[caseName, 'conditions']}>
                    {(condFields, { add: addCond, remove: removeCond }) => (
                      <div className="flex flex-col gap-1">
                        {condFields.map(({ key: condKey, name: condName, ...restCond }) => (
                          <div key={condKey} className="flex items-center gap-1">
                            <Form.Item {...restCond} name={[condName, 'option']} className="!mb-0 shrink-0 w-[112px]" rules={[{ required: true, message: '' }]}>
                              <Select size="small" options={OPERATOR_OPTIONS} placeholder="연산자" />
                            </Form.Item>
                            <Form.Item {...restCond} name={[condName, 'value']} className="!mb-0 flex-1">
                              <Input size="small" placeholder="비교 값" />
                            </Form.Item>
                            <Button size="small" type="text" icon={<Trash2 size={12} className="text-red-500" />} onClick={() => removeCond(condName)} />
                          </div>
                        ))}
                        <Button block size="small" type="dashed" icon={<Plus size={12} />} onClick={() => addCond({ option: '포함', value: '' })}>
                          조건 추가
                        </Button>
                      </div>
                    )}
                  </Form.List>
                  {/* 이동 노드 — 라벨 inline */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-600 shrink-0">→ 이동</span>
                    <Form.Item {...restCase} name={[caseName, 'goto']} className="!mb-0 flex-1" rules={[{ required: true, message: '' }]}>
                      <Select size="small" options={nodeOptions} placeholder="노드 선택" showSearch optionFilterProp="label" notFoundContent={DROPDOWN_EMPTY} />
                    </Form.Item>
                  </div>
                </div>
              ))}
              <Button block size="small" type="dashed" icon={<Plus size={12} />} onClick={() => addCase({ logic: 'AND', goto: '', conditions: [{ option: '포함', value: '' }] })}>
                IF 추가
              </Button>
            </div>
          )}
        </Form.List>
      ),
    });
    items.push({
      key: 'else',
      label: <span className="text-sm font-semibold text-gray-800">예외처리</span>,
      children: (
        <Form.Item name={['data', 'else_goto']} label="ELSE 이동 노드" extra="모든 조건이 일치하지 않을 경우 이동할 노드" className="!mb-0">
          <Select size="small" options={nodeOptions} placeholder="노드 선택" showSearch optionFilterProp="label" allowClear notFoundContent={DROPDOWN_EMPTY} />
        </Form.Item>
      ),
    });
  } else {
    // prompt 모드 — LLM 이 의도 라우팅을 판단하므로 LLM 노드와 동일한 모델 설정 필요
    items.push({
      key: 'model',
      label: <span className="text-sm font-semibold text-gray-800">모델 설정</span>,
      children: <ModelSettingsFields />,
    });
    items.push({
      key: 'routes',
      label: <span className="text-sm font-semibold text-gray-800">의도 라우팅</span>,
      children: (
        <Form.List name={['data', 'routes']}>
          {(fields, { add, remove }) => (
            <div className="flex flex-col gap-2">
              {fields.length > 0 && (
                <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-gray-500">
                  <span className="flex-1">의도명</span>
                  <span className="flex-1">다음 노드</span>
                  <span className="w-6" />
                </div>
              )}
              {fields.map(({ key, name, ...rest }) => (
                <div key={key} className="flex items-start gap-2">
                  <Form.Item {...rest} name={[name, 'label']} className="flex-1 !mb-0" rules={[{ required: true, message: '의도명' }]}>
                    <Input size="small" placeholder="예: 잔액조회" />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'node_id']} className="flex-1 !mb-0" rules={[{ required: true, message: '필수' }]}>
                    <Select size="small" options={nodeOptions} placeholder="노드 선택" showSearch optionFilterProp="label" notFoundContent={DROPDOWN_EMPTY} />
                  </Form.Item>
                  <Button size="small" type="text" icon={<Trash2 size={12} className="text-red-500" />} onClick={() => remove(name)} />
                </div>
              ))}
              <Button block size="small" type="dashed" icon={<Plus size={12} />} onClick={() => add({ label: '', node_id: '' })}>
                의도 추가
              </Button>
            </div>
          )}
        </Form.List>
      ),
    });
    items.push({
      key: 'fallback',
      label: <span className="text-sm font-semibold text-gray-800">예외처리</span>,
      children: (
        <Form.Item name={['data', 'fallback_node']} label="Fallback 노드" extra="입력한 의도와 일치하는 라우팅 결과가 없을 경우, Fallback 노드로 이동합니다.">
          <Select options={nodeOptions} placeholder="노드 선택" showSearch optionFilterProp="label" allowClear notFoundContent={DROPDOWN_EMPTY} />
        </Form.Item>
      ),
    });
  }

  items.push({
    key: 'output',
    label: <span className="text-sm font-semibold text-gray-800">출력</span>,
    children: (
      <OutputVariableNotice
        nodeId={node.nodeId}
        nodeLabel={node.nodeLabel}
        nodeKind={node.nodeKind}
        outputVariable={node.data?.output_variable as string | undefined}
        dataType="string"
        description="선택된 라우팅 결과"
      />
    ),
  });

  return (
    <Collapse
      defaultActiveKey={['type', 'cases', 'else', 'model', 'routes', 'fallback', 'output']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={items}
    />
  );
}
