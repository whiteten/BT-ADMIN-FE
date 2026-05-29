import { memo } from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { Server, Wrench } from 'lucide-react';

/**
 * LLM 노드 아래에 시각적으로만 표시되는 가상 도구 노드.
 * WorkflowCanvas 의 derive 단계에서 LLM data 의 mcpSettings / tool_list 로부터 매번 합성되며,
 * BE 그래프에는 존재하지 않음(deploy JSON 제외). 사용자 조작(드래그·삭제·선택) 불가.
 */
export interface ToolNodeData {
  label: string;
  toolType: 'mcp' | 'default';
  parentNodeId: string;
}

const TOOL_STYLE: Record<ToolNodeData['toolType'], { bg: string; bgDark: string; ring: string; icon: typeof Server }> = {
  mcp: { bg: '#8B5CF6', bgDark: '#7C3AED', ring: '#8B5CF633', icon: Server },
  default: { bg: '#3B82F6', bgDark: '#2563EB', ring: '#3B82F633', icon: Wrench },
};

const ToolNode = ({ data }: NodeProps) => {
  const { label, toolType } = data as unknown as ToolNodeData;
  const style = TOOL_STYLE[toolType] ?? TOOL_STYLE.default;
  const Icon = style.icon;

  return (
    <div className="flex flex-col items-center select-none pointer-events-none">
      <Handle type="target" position={Position.Top} id="tool" className="!w-0 !h-0 !min-w-0 !min-h-0 !border-0 !bg-transparent" isConnectable={false} />
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${style.bg} 0%, ${style.bgDark} 100%)`,
          boxShadow: `0 0 0 3px ${style.ring}, 0 2px 6px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
        }}
      >
        <Icon size={14} className="text-white" />
      </div>
      <div className="mt-1 text-[11px] text-gray-600 font-medium whitespace-nowrap max-w-[120px] truncate" title={label}>
        {label}
      </div>
    </div>
  );
};

ToolNode.displayName = 'ToolNode';

export default memo(ToolNode);
