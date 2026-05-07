import { useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react';
import { NODE_DRAG_MIME, NODE_GROUP_LABELS, NODE_GROUP_ORDER, NODE_KINDS_BY_GROUP, type NodeGroup, type NodeKindMeta } from '../constants/nodeKinds';

const handleDragStart = (event: React.DragEvent<HTMLDivElement>, kind: string) => {
  event.dataTransfer.setData(NODE_DRAG_MIME, kind);
  event.dataTransfer.effectAllowed = 'move';
};

interface NodePaletteCardProps {
  meta: NodeKindMeta;
}

const NodePaletteCard = ({ meta }: NodePaletteCardProps) => {
  const Icon = meta.icon;
  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, meta.kind)}
      className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white cursor-grab hover:border-[var(--color-bt-primary)] hover:shadow-sm transition-all"
      title={meta.description ?? meta.label}
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded text-white shrink-0" style={{ backgroundColor: meta.color }}>
        <Icon size={14} />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-gray-700 truncate">{meta.label}</span>
        {meta.description && <span className="text-[11px] text-gray-400 truncate">{meta.description}</span>}
      </div>
    </div>
  );
};

interface WorkflowSidebarProps {
  onClose?: () => void;
}

export default function WorkflowSidebar({ onClose }: WorkflowSidebarProps) {
  const [expanded, setExpanded] = useState<Record<NodeGroup, boolean>>({
    system: true,
    ai: true,
    logic: true,
    transform: true,
    utility: true,
    error: true,
  });

  const toggleGroup = (group: NodeGroup) => {
    setExpanded((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <aside className="w-[260px] h-full bg-white flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-800">노드 목록</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">캔버스로 끌어다 놓으세요.</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            aria-label="사이드바 닫기"
            title="사이드바 닫기"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {NODE_GROUP_ORDER.map((group) => {
          const items = NODE_KINDS_BY_GROUP[group].filter((m) => m.enabled);
          if (!items.length) return null;
          const isOpen = expanded[group];
          return (
            <div key={group} className="flex flex-col gap-2">
              <button type="button" onClick={() => toggleGroup(group)} className="flex items-center gap-1 px-1 text-xs font-semibold text-gray-600 hover:text-gray-800">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{NODE_GROUP_LABELS[group]}</span>
                <span className="text-gray-400 font-normal">({items.length})</span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2 pl-1">
                  {items.map((meta) => (
                    <NodePaletteCard key={meta.kind} meta={meta} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
