/**
 * Flow 목록 컴포넌트
 * - 검색 가능한 리스트
 * - 선택 시 onSelect 콜백
 */

import { useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import type { BffFlow } from '../types/bffFlow.types';

interface FlowListProps {
  flows: BffFlow[];
  selectedFlowId: string | null;
  onSelect: (flow: BffFlow | null) => void;
  onAdd: () => void;
}

export default function FlowList({ flows, selectedFlowId, onSelect, onAdd }: FlowListProps) {
  const [search, setSearch] = useState('');

  const filteredFlows = useMemo(() => {
    if (!search) return flows;
    const lower = search.toLowerCase();
    return flows.filter((f) => f.flowId.toLowerCase().includes(lower) || f.description?.toLowerCase().includes(lower));
  }, [flows, search]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 검색 + 추가 버튼 */}
      <div className="flex gap-2">
        <Input placeholder="Flow 검색..." prefix={<Search className="size-4 text-gray-400" />} value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
        <Button type="primary" onClick={onAdd}>
          추가
        </Button>
      </div>

      {/* Flow 리스트 */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
        {filteredFlows.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredFlows.map((flow) => (
              <li key={flow.flowId} className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${selectedFlowId === flow.flowId ? 'bg-blue-100' : ''}`} onClick={() => onSelect(flow)}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{flow.description || flow.flowId}</div>
                  <div className="text-xs text-gray-400 truncate">{flow.flowId}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Flow가 없습니다</div>
        )}
      </div>
    </div>
  );
}
