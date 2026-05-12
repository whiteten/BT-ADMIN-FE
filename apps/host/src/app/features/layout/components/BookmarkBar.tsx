import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { sharedApi } from '@/shared-api';
import { useNavigationStore } from '@/shared-store';
import BookmarkChip from './BookmarkChip';
import BookmarkOverflowMenu from './BookmarkOverflowMenu';
import SortableBookmarkChip from './SortableBookmarkChip';
import { useUpdateBookmark } from '../hooks/useBookmarkQueries';
import { useOverflowItems } from '../hooks/useOverflowItems';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';

const RESERVED_OVERFLOW_WIDTH = 64;

export default function BookmarkBar() {
  const queryClient = useQueryClient();
  const { favorites } = useNavigationStore();
  const [sorted, setSorted] = useState<Bookmark[]>([]);

  useEffect(() => {
    setSorted([...favorites].sort((a, b) => a.sortOrder - b.sortOrder));
  }, [favorites]);

  const { mutate: updateBookmark } = useUpdateBookmark({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const { containerRef, measureRef, visibleItems, overflowItems } = useOverflowItems<Bookmark>(sorted, RESERVED_OVERFLOW_WIDTH);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSorted((prev) => {
      const oldIndex = prev.findIndex((item) => item.menuKey === active.id);
      const newIndex = prev.findIndex((item) => item.menuKey === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      updateBookmark({ params: {}, data: { menuKeys: next.map((f) => f.menuKey) } });
      return next;
    });
  };

  if (sorted.length === 0) {
    return <div className="flex-1 min-w-0" aria-hidden />;
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 h-9 flex items-center overflow-hidden">
      {/* 측정용 — 화면 밖에서 모든 칩 폭 측정 */}
      <div ref={measureRef} className="absolute invisible pointer-events-none flex items-center gap-1 -top-[9999px] left-0">
        {sorted.map((bookmark) => (
          <BookmarkChip key={`measure-${bookmark.menuKey}`} bookmark={bookmark} />
        ))}
      </div>

      {/* 가시 영역 */}
      <div className="flex items-center gap-1 min-w-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleItems.map((b) => b.menuKey)} strategy={horizontalListSortingStrategy}>
            {visibleItems.map((bookmark) => (
              <SortableBookmarkChip key={bookmark.menuKey} bookmark={bookmark} />
            ))}
          </SortableContext>
        </DndContext>
        {overflowItems.length > 0 && <BookmarkOverflowMenu bookmarks={overflowItems} />}
      </div>
    </div>
  );
}
