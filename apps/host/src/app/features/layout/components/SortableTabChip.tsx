import { useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { OpenTab } from '@/shared-store';
import TabChip from './TabChip';

interface SortableTabChipProps {
  tab: OpenTab;
  isActive: boolean;
  /** 가시 목록의 첫 항목 — 왼쪽으로 옮길 수 없으므로 « 숨김 */
  isFirst: boolean;
  /** 가시 목록의 마지막 항목 — 오른쪽으로 옮길 수 없으므로 » 숨김 */
  isLast: boolean;
}

export default function SortableTabChip({ tab, isActive, isFirst, isLast }: SortableTabChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const { active } = useDndContext();
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : undefined,
    touchAction: 'none',
  };

  // 드래그 중이 아니고, 옮길 방향이 실제로 존재할 때만 화살표 노출
  const showLeft = active === null && !isFirst;
  const showRight = active === null && !isLast;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group relative hover:z-10">
      {/* hover 시 칩 좌우로 밀려나며 나타나는 « » — 드래그로 옮길 수 있음을 표현. 칩 크기는 그대로(absolute로 흐름에서 분리) */}
      {showLeft && (
        <ChevronsLeft
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-white/70 opacity-0 transition-all duration-200 group-hover:-translate-x-2.5 group-hover:opacity-100"
        />
      )}
      {showRight && (
        <ChevronsRight
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 text-white/70 opacity-0 transition-all duration-200 group-hover:translate-x-2.5 group-hover:opacity-100"
        />
      )}
      <TabChip tab={tab} isActive={isActive} disableTooltip={active !== null} />
    </div>
  );
}
