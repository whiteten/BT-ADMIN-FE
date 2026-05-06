import { useEffect, useRef, useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import WorkflowCanvas from './WorkflowCanvas';
import WorkflowSidebar from './WorkflowSidebar';
import WorkflowToolbar from './WorkflowToolbar';
import type { WorkflowGraph } from '../types';

interface WorkflowEditorProps {
  agentId: string;
  agentName?: string;
  graph: WorkflowGraph;
}

const SIDEBAR_BREAKPOINT = 1024;

const isWideViewport = () => (typeof window === 'undefined' ? true : window.innerWidth >= SIDEBAR_BREAKPOINT);

export default function WorkflowEditor({ agentId, agentName, graph }: WorkflowEditorProps) {
  const [sidebarOpen, setSidebarOpen] = useState(isWideViewport);
  const prevWideRef = useRef(isWideViewport());

  useEffect(() => {
    const handleResize = () => {
      const isWide = isWideViewport();
      if (isWide !== prevWideRef.current) {
        setSidebarOpen(isWide);
        prevWideRef.current = isWide;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-50 overflow-hidden">
      <WorkflowToolbar agentId={agentId} agentName={agentName} />
      <div className="flex flex-1 min-h-0 relative">
        {sidebarOpen && <WorkflowSidebar onClose={() => setSidebarOpen(false)} />}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            aria-label="사이드바 열기"
            title="노드 목록 열기"
          >
            <PanelLeftOpen size={16} />
            <span className="text-xs font-medium">노드 목록</span>
          </button>
        )}
        <WorkflowCanvas agentId={agentId} graph={graph} />
      </div>
    </div>
  );
}
