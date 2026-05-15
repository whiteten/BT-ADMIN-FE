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
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
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
    return (
      <div className="flex-1 min-w-0 flex items-center gap-1.5 text-white/40 text-sm">
        <IconBookmark className="size-4 shrink-0" />
        <span className="truncate">자주 쓰는 메뉴를 북마크 해보세요.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-9 flex items-center gap-1">
      {/* 영역 마커 — 좌측에 고정된 북마크 아이콘으로 "여기는 북마크 영역" 표시 (overflow 계산 대상에서 제외) */}
      <IconBookmark className="size-5 shrink-0 text-white/80" aria-hidden />

      <div ref={containerRef} className="relative flex-1 min-w-0 h-full flex items-center overflow-hidden">
        {/* 측정용 — 화면 밖에서 모든 칩 폭 측정 */}
        <div ref={measureRef} className="absolute invisible pointer-events-none flex items-center gap-1 -top-[9999px] left-0">
          {sorted.map((bookmark) => (
            <BookmarkChip key={`measure-${bookmark.menuKey}`} bookmark={bookmark} />
          ))}
        </div>

        {/* 가시 영역 — 좌우 정렬 변경되는 칩 트랙. 하단 활성 보더 인디케이터와의 시각 균형을 위해 mt-0.5(2px) */}
        <div className="flex items-center gap-1 min-w-0 mt-0.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleItems.map((b) => b.menuKey)} strategy={horizontalListSortingStrategy}>
              {visibleItems.map((bookmark, index) => (
                <SortableBookmarkChip key={bookmark.menuKey} bookmark={bookmark} isFirst={index === 0} isLast={index === visibleItems.length - 1} />
              ))}
            </SortableContext>
          </DndContext>
          {overflowItems.length > 0 && <BookmarkOverflowMenu bookmarks={overflowItems} />}
        </div>
      </div>
    </div>
  );
}
