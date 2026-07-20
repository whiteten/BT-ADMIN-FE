import { Collapse, Form, Input, TreeSelect } from 'antd';
import ModelSettingsFields from './ModelSettingsFields';
import OutputVariableNotice from './OutputVariableNotice';
import VariableTextArea from './VariableTextArea';
import { useGetAllMcpTools } from '../../../mcp/hooks/useMcpQueries';
import { useGetAllTools } from '../../../tool/hooks/useToolQueries';
import type { FlowNode, WorkflowGraph } from '../../types';
import { getUpstreamVariables } from '../../utils/variableTokens';

const PROMPT_NAME_SYSTEM = ['data', 'systemPrompt'];
const PROMPT_NAME_USER = ['data', 'userPrompt'];

interface McpToolMeta {
  server_name: string;
  source: string;
  tool_name: string;
}

interface McpSettingsValue {
  enabled: boolean;
  selectedMCPs: string[];
  mcpList: McpToolMeta[];
}

interface ToolListValue {
  default: Record<string, string[]>;
  mcp: Record<string, string[]>;
}

const composeLeafKey = (parent: string, name: string) => `${parent}::${name}`;

const splitLeafKey = (key: string): [string, string] => {
  const idx = key.indexOf('::');
  return idx < 0 ? [key, ''] : [key.slice(0, idx), key.slice(idx + 2)];
};

/**
 * 객체 값을 form store 에 보관하기 위한 hidden 더미 필드.
 * Ant Form 의 Form.Item 자식은 controlled component(value/onChange) 여야 하는데
 * Input 은 string 전용이라 객체 value 를 받으면 React 가 `[object Object]` 로 cast 하고
 * controlled→uncontrolled 경고와 함께 동기화 사이클에서 store 값이 손상될 수 있음.
 * 이 컴포넌트는 value/onChange prop 만 받고 DOM 을 렌더하지 않아 안전하게 객체 보관 가능.
 */
const HiddenObjectField = (_props: { value?: unknown; onChange?: (v: unknown) => void }) => null;
HiddenObjectField.displayName = 'HiddenObjectField';

interface LlmPropertiesProps {
  node: FlowNode;
  graph: WorkflowGraph;
}

export default function LlmProperties({ node, graph }: LlmPropertiesProps) {
  const form = Form.useFormInstance();
  const { servers: mcpServers, toolsByServer, isLoading: isLoadingMcp } = useGetAllMcpTools();
  const { groups: toolGroups, toolsByGroup, isLoading: isLoadingTools } = useGetAllTools();
  const variables = getUpstreamVariables(node.nodeId, graph);

  // MCP / 도구 객체값은 node.data 에서 직접 derive — form store 동기화 이슈와 무관하게 graph cache(optimistic 포함) 가 SoT.
  // 부모(WorkflowPropertiesPanel.handleSubmit) 가 form.submit() 시 graph cache 를 즉시 update 하므로 onChange → 다음 render 에 새 값 반영됨.
  const nodeData = (node.data ?? {}) as Record<string, unknown>;
  const currentMcpSettings = nodeData.mcpSettings as McpSettingsValue | undefined;
  const currentToolList = nodeData.tool_list as ToolListValue | undefined;
  const currentToolNameList = nodeData.tool_name_list as string[] | undefined;

  // MCP 트리 — 부모: 서버, 자식: 도구. leaf value = `${serverName}::${toolName}` 합성 키.
  const mcpTreeData = mcpServers.map((server) => ({
    title: server.serverName,
    value: composeLeafKey('__mcp_server__', server.serverName),
    selectable: false,
    checkable: true,
    children: (toolsByServer[server.serverName] ?? []).map((tool) => ({
      title: tool.toolName,
      value: composeLeafKey(server.serverName, tool.toolName),
    })),
  }));

  const mcpSelectedValues = Object.entries(currentToolList?.mcp ?? {}).flatMap(([server, tools]) => tools.map((toolName) => composeLeafKey(server, toolName)));

  // 도구 트리 — 부모: 도구 그룹, 자식: 도구. leaf value = `${groupId}::${toolName}`.
  const toolTreeData = toolGroups.map((group) => ({
    title: group.groupName,
    value: composeLeafKey('__tool_group__', group.groupId),
    selectable: false,
    checkable: true,
    children: (toolsByGroup[group.groupId] ?? []).map((tool) => ({
      title: tool.toolName,
      value: composeLeafKey(group.groupId, tool.toolName),
    })),
  }));

  const toolSelectedValues = Object.entries(currentToolList?.default ?? {}).flatMap(([groupId, tools]) => tools.map((toolName) => composeLeafKey(groupId, toolName)));

  // MCP 선택 변경 — mcpSettings + tool_list.mcp + tool_name_list 동시 갱신 후 form.submit() 으로 저장 트리거.
  // AS-IS aoe-studio/web/components/workflow/nodes/llm/properties.tsx handleMcpChange 로직 포팅.
  const handleMcpToolsChange = (selectedKeys: string[]) => {
    const mcpGrouped: Record<string, string[]> = {};
    const selectedMCPs: string[] = [];
    const mcpList: McpToolMeta[] = [];

    selectedKeys.forEach((key) => {
      const [serverName, toolName] = splitLeafKey(key);
      if (!serverName || !toolName) return;
      if (!mcpGrouped[serverName]) mcpGrouped[serverName] = [];
      mcpGrouped[serverName].push(toolName);
      selectedMCPs.push(toolName);
      const meta = toolsByServer[serverName]?.find((t) => t.toolName === toolName);
      mcpList.push({ server_name: serverName, source: meta?.source ?? '', tool_name: toolName });
    });

    const prevMcpSelected = currentMcpSettings?.selectedMCPs ?? [];
    const nextToolList: ToolListValue = {
      default: currentToolList?.default ?? {},
      mcp: mcpGrouped,
    };
    const nextToolNameList = Array.from(new Set([...(currentToolNameList ?? []).filter((name) => !prevMcpSelected.includes(name)), ...selectedMCPs]));

    form.setFieldValue(['data', 'mcpSettings'], { enabled: selectedMCPs.length > 0, selectedMCPs, mcpList });
    form.setFieldValue(['data', 'tool_list'], nextToolList);
    form.setFieldValue(['data', 'tool_name_list'], nextToolNameList);
    form.submit();
  };

  // 도구 선택 변경 — tool_list.default + tool_name_list 갱신. MCP 쪽은 보존.
  // AS-IS handleToolChange 로직 포팅.
  const handleToolsChange = (selectedKeys: string[]) => {
    const grouped: Record<string, string[]> = {};
    selectedKeys.forEach((key) => {
      const [groupId, toolName] = splitLeafKey(key);
      if (!groupId || !toolName) return;
      if (!grouped[groupId]) grouped[groupId] = [];
      grouped[groupId].push(toolName);
    });

    const flatToolNames = Object.values(grouped).flat();
    const mcpSelected = currentMcpSettings?.selectedMCPs ?? [];
    const nextToolList: ToolListValue = {
      default: grouped,
      mcp: currentToolList?.mcp ?? {},
    };
    const nextToolNameList = Array.from(new Set([...mcpSelected, ...flatToolNames]));

    form.setFieldValue(['data', 'tool_list'], nextToolList);
    form.setFieldValue(['data', 'tool_name_list'], nextToolNameList);
    form.submit();
  };

  return (
    <Collapse
      defaultActiveKey={['model', 'prompt', 'mcp', 'advanced', 'output']}
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
          children: <ModelSettingsFields />,
        },
        {
          key: 'prompt',
          label: <span className="text-sm font-semibold text-gray-800">프롬프트</span>,
          children: (
            <>
              <Form.Item name={PROMPT_NAME_SYSTEM} label="System 프롬프트" extra="모델의 역할·행동 지침. `/` 입력 시 변수 dropdown.">
                <VariableTextArea variables={variables} placeholder="시스템 프롬프트를 입력하세요." rows={3} />
              </Form.Item>
              <Form.Item
                name={PROMPT_NAME_USER}
                label="User 프롬프트 템플릿"
                extra="이전 노드의 출력 변수를 `/` 로 검색해 삽입할 수 있습니다."
                rules={[{ required: true, message: 'User 프롬프트를 입력해 주세요.' }]}
              >
                <VariableTextArea variables={variables} placeholder="사용자 프롬프트를 입력하세요." rows={3} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'mcp',
          label: <span className="text-sm font-semibold text-gray-800">MCP 설정</span>,
          children: (
            <>
              {/* hidden: TreeSelect 가 form 값을 직접 다루지 않으므로 보조 필드 등록 (onValuesChange 의 allValues 포함).
                  객체 값을 보관해야 하므로 Input(string 전용) 대신 HiddenObjectField 사용. */}
              <Form.Item name={['data', 'mcpSettings']} hidden>
                <HiddenObjectField />
              </Form.Item>
              <Form.Item label="MCP 선택" extra="MCP 도구를 서버별로 그룹화하여 선택할 수 있습니다.">
                <TreeSelect
                  treeData={mcpTreeData}
                  value={mcpSelectedValues}
                  onChange={handleMcpToolsChange}
                  treeCheckable
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  treeDefaultExpandAll
                  showSearch={{
                    filterTreeNode: (input, node) =>
                      String(node.title ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase()),
                  }}
                  allowClear
                  placeholder="MCP 도구 선택"
                  loading={isLoadingMcp}
                  maxTagCount="responsive"
                  className="w-full"
                />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'advanced',
          label: <span className="text-sm font-semibold text-gray-800">고급 설정</span>,
          children: (
            <>
              <Form.Item name={['data', 'tool_list']} hidden>
                <HiddenObjectField />
              </Form.Item>
              <Form.Item name={['data', 'tool_name_list']} hidden>
                <HiddenObjectField />
              </Form.Item>
              <Form.Item label="도구 선택" extra="도구를 그룹별로 선택할 수 있습니다. 선택한 도구들은 LLM이 특정 작업을 수행하는 데 사용됩니다.">
                <TreeSelect
                  treeData={toolTreeData}
                  value={toolSelectedValues}
                  onChange={handleToolsChange}
                  treeCheckable
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  treeDefaultExpandAll
                  showSearch={{
                    filterTreeNode: (input, node) =>
                      String(node.title ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase()),
                  }}
                  allowClear
                  placeholder="도구 선택"
                  loading={isLoadingTools}
                  treeNodeFilterProp="title"
                  maxTagCount="responsive"
                  className="w-full"
                />
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
              description="생성된 내용"
            />
          ),
        },
      ]}
    />
  );
}
