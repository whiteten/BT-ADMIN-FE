import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { type OpenTab, useOpenTabsStore } from '@/shared-store';
import SortableTabChip from './SortableTabChip';
import TabChip from './TabChip';
import TabOverflowMenu from './TabOverflowMenu';
import { useOverflowItems } from '../hooks/useOverflowItems';

const RESERVED_OVERFLOW_WIDTH = 64;

/**
 * SubHeader 가운데 영역의 브라우저 탭 스트립.
 * 열린 탭을 가시 영역에 칩으로 렌더하고, 폭을 넘치면 더보기 드롭다운으로 접는다.
 * 가시 칩은 좌우로 드래그 재정렬할 수 있다(옛 즐겨찾기 바와 동일 효과).
 * 탭 없으면 null(부모 wrapper의 flex-1이 BreadcrumbSlot을 우측으로 밀어줌).
 */
export default function TabStrip() {
  const tabs = useOpenTabsStore((s) => s.tabs);
  const activeId = useOpenTabsStore((s) => s.activeId);
  const reorderTab = useOpenTabsStore((s) => s.reorderTab);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const { containerRef, measureRef, visibleItems, overflowItems } = useOverflowItems<OpenTab>(tabs, RESERVED_OVERFLOW_WIDTH);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderTab(String(active.id), String(over.id));
  };

  if (tabs.length === 0) return null;

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 h-full flex items-center overflow-hidden">
      {/* 측정용 — 화면 밖에서 모든 칩 폭 측정(닫기 버튼 포함, 가시 칩과 동일 규격) */}
      <div ref={measureRef} className="absolute invisible pointer-events-none flex items-center gap-1 -top-[9999px] left-0">
        {tabs.map((tab) => (
          <TabChip key={`measure-${tab.id}`} tab={tab} isActive={false} />
        ))}
      </div>

      {/* 가시 영역 — 좌우 정렬 변경되는 칩 트랙. 하단 활성 보더와의 시각 균형을 위해 mt-0.5(2px) */}
      <div className="flex items-center gap-1 min-w-0 mt-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleItems.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {visibleItems.map((tab, index) => (
              <SortableTabChip key={tab.id} tab={tab} isActive={tab.id === activeId} isFirst={index === 0} isLast={index === visibleItems.length - 1} />
            ))}
          </SortableContext>
        </DndContext>
        {overflowItems.length > 0 && <TabOverflowMenu tabs={overflowItems} activeId={activeId} />}
      </div>
    </div>
  );
}
