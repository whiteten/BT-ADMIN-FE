import A2AProperties from './A2AProperties';
import BasicProperties from './BasicProperties';
import GuardrailProperties from './GuardrailProperties';
import KnowledgeSearchProperties from './KnowledgeSearchProperties';
import LlmProperties from './LlmProperties';
import type { FlowNode, WorkflowGraph } from '../../types';

interface WorkflowPropertiesFactoryProps {
  node: FlowNode;
  graph: WorkflowGraph;
}

/**
 * 노드 kind 별 properties 폼 분기.
 * - 정의되지 않은 kind 는 BasicProperties 로 fallback.
 * - 모든 컴포넌트는 부모 Panel 의 Form 인스턴스 안에서 동작 (Form.Item name 으로 값 바인딩).
 */
export default function WorkflowPropertiesFactory({ node, graph }: WorkflowPropertiesFactoryProps) {
  switch (node.nodeKind) {
    case 'llm':
      return <LlmProperties node={node} graph={graph} />;
    case 'knowledgeSearch':
      return <KnowledgeSearchProperties node={node} />;
    case 'a2a_agent':
      return <A2AProperties node={node} />;
    case 'guardrail':
      return <GuardrailProperties node={node} graph={graph} />;
    case 'start':
    case 'answer':
    case 'error':
    default:
      return <BasicProperties node={node} />;
  }
}
