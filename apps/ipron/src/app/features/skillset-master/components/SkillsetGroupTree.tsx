/**
 * SkillsetGroupTree — 스킬셋 업무그룹 트리 (Phase 1 stub).
 * TODO Phase 2: 실제 트리 UI 구현
 */
import { Empty } from 'antd';
import type { SkillsetGroupResponse } from '../types';

interface Props {
  groups: SkillsetGroupResponse[];
  totalSkillsetCount: number;
  totalUnassignedCount: number;
  selectedTreeId: number | null;
  selectedTenantId: number | null;
  onSelect: (id: number | null) => void;
  onCreateChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSkillsetDrop: () => void;
}

export default function SkillsetGroupTree({ groups, totalSkillsetCount, totalUnassignedCount, selectedTreeId, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full p-2 gap-1 text-sm">
      <button
        type="button"
        className={`text-left px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTreeId === null ? 'bg-blue-50 text-blue-600 font-medium' : ''}`}
        onClick={() => onSelect(null)}
      >
        전체 ({totalSkillsetCount})
      </button>
      <button
        type="button"
        className={`text-left px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTreeId === 0 ? 'bg-blue-50 text-blue-600 font-medium' : ''}`}
        onClick={() => onSelect(0)}
      >
        미배정 ({totalUnassignedCount})
      </button>
      {groups.length === 0 ? (
        <Empty description="업무그룹 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} className="mt-2" />
      ) : (
        groups.map((g) => (
          <button
            key={g.groupId}
            type="button"
            className={`text-left px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTreeId === g.groupId ? 'bg-blue-50 text-blue-600 font-medium' : ''}`}
            onClick={() => onSelect(g.groupId)}
          >
            {g.groupName} ({g.skillsetCount})
          </button>
        ))
      )}
    </div>
  );
}
