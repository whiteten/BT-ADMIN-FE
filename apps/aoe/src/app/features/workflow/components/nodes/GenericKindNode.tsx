import { memo } from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { MoreVertical } from 'lucide-react';
import { DEFAULT_NODE_KIND, NODE_KIND_MAP, type NodeKindMeta } from '../../constants/nodeKinds';

export interface GenericKindNodeData {
  kind: string;
  label?: string;
  description?: string;
  [key: string]: unknown;
}

const hexToRgba = (hex: string, alpha: number) => {
  const m = hex.replace('#', '');
  const value =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface DetailLineProps {
  meta: NodeKindMeta;
  text: string;
  badge?: string;
}

const DetailLine = ({ meta, text, badge }: DetailLineProps) => (
  <div className="flex items-center gap-2 px-2 py-1 rounded-md mt-1.5" style={{ backgroundColor: hexToRgba(meta.color, 0.08) }}>
    <span className="text-[11px] text-gray-700 font-medium truncate flex-1">{text}</span>
    {badge && (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: hexToRgba(meta.color, 0.18), color: meta.color }}>
        {badge}
      </span>
    )}
  </div>
);

const renderDetail = (kind: string, data: GenericKindNodeData, meta: NodeKindMeta) => {
  switch (kind) {
    case 'llm': {
      // form path: data.modelName / data.modelTypeName (LlmProperties 가 저장)
      const name = (data.modelName ?? data.name ?? data.model_id) as string | undefined;
      const typeName = data.modelTypeName as string | undefined;
      if (!name) return null;
      const text = typeName ? `[${typeName}] ${name}` : name;
      return <DetailLine meta={meta} text={text} />;
    }
    case 'knowledgeSearch': {
      // form path: data.documentIds (KnowledgeSearchProperties 가 저장)
      const documentIds = data.documentIds as unknown[] | undefined;
      const ragConfig = data.rag_config as unknown[] | undefined;
      const ids = Array.isArray(documentIds) ? documentIds : Array.isArray(ragConfig) ? ragConfig : [];
      if (!ids.length) return null;
      const text = `${ids.length}개 문서`;
      const badge = ids.length > 1 ? `+${ids.length - 1}` : undefined;
      return <DetailLine meta={meta} text={text} badge={badge} />;
    }
    case 'databaseSearch': {
      const conn = data.dbConnection as { dbType?: string; host?: string } | undefined;
      const dbType = conn?.dbType ?? (data.dbType as string | undefined);
      if (!dbType) return null;
      const host = conn?.host ?? (data.host as string | undefined);
      const text = host ? `${dbType} · ${host}` : dbType;
      return <DetailLine meta={meta} text={text} />;
    }
    case 'http': {
      const method = (data.method as string | undefined)?.toUpperCase();
      const url = data.url as string | undefined;
      if (!method && !url) return null;
      const text = method && url ? `${method} ${url}` : (method ?? url ?? '');
      return <DetailLine meta={meta} text={text} />;
    }
    case 'a2a_agent': {
      // form path: data.agentName (A2AProperties 가 저장)
      const name = (data.agentName ?? data.name) as string | undefined;
      if (!name) return null;
      return <DetailLine meta={meta} text={name} />;
    }
    case 'guardrail': {
      const moderation = data.moderation_type as string | undefined;
      if (!moderation) return null;
      return <DetailLine meta={meta} text={moderation === 'vllm' ? 'vLLM Mod' : 'OpenAI Mod'} />;
    }
    case 'condition': {
      const cases = data.cases as unknown[] | undefined;
      const conditionType = (data.condition_type as string | undefined) ?? 'operator';
      if (!Array.isArray(cases) || !cases.length) return null;
      return <DetailLine meta={meta} text={conditionType === 'operator' ? `${cases.length}개 조건` : 'Prompt 방식'} />;
    }
    case 'error': {
      const message = data.errorMessage as string | undefined;
      if (!message) return null;
      return (
        <div className="mt-1.5 px-2 py-1.5 rounded-md border border-red-100 bg-red-50">
          <p className="text-[11px] text-red-600 font-medium line-clamp-2 break-all">{message}</p>
        </div>
      );
    }
    default:
      return null;
  }
};

const GenericKindNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as GenericKindNodeData;
  const meta = NODE_KIND_MAP[nodeData.kind] ?? DEFAULT_NODE_KIND;
  const Icon = meta.icon;
  const label = nodeData.label ?? meta.label;
  const description = nodeData.description ?? meta.description ?? meta.label;

  const isStart = meta.kind === 'start';
  const isAnswer = meta.kind === 'answer';

  return (
    <div
      className="bg-white rounded-xl transition-all relative"
      style={{
        width: 220,
        border: `1.5px solid ${selected ? meta.color : hexToRgba(meta.color, 0.35)}`,
        boxShadow: selected ? `0 0 0 3px ${hexToRgba(meta.color, 0.18)}, 0 6px 16px rgba(15, 23, 42, 0.08)` : '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.05)',
      }}
    >
      {!isStart && <Handle type="target" position={Position.Left} id="in" className="!w-3 !h-3 !rounded-full !border-2 !border-white" style={{ background: meta.color }} />}

      <div className="flex items-center gap-2 px-3 h-12 rounded-t-xl" style={{ backgroundColor: hexToRgba(meta.color, 0.1) }}>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white shrink-0" style={{ backgroundColor: meta.color }}>
          <Icon size={14} />
        </span>
        <span className="text-sm font-semibold text-gray-800 truncate flex-1">{label}</span>
        <button
          type="button"
          className="p-1 rounded hover:bg-white/60 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="더보기"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="px-3 py-2 bg-white rounded-b-xl">
        <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
        {renderDetail(meta.kind, nodeData, meta)}
      </div>

      {!isAnswer && <Handle type="source" position={Position.Right} id="out" className="!w-3 !h-3 !rounded-full !border-2 !border-white" style={{ background: meta.color }} />}
    </div>
  );
};

GenericKindNode.displayName = 'GenericKindNode';

export default memo(GenericKindNode);
