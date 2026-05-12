import { useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import BookmarkChip from './BookmarkChip';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';

interface SortableBookmarkChipProps {
  bookmark: Bookmark;
}

export default function SortableBookmarkChip({ bookmark }: SortableBookmarkChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bookmark.menuKey });
  const { active } = useDndContext();
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : undefined,
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BookmarkChip bookmark={bookmark} disableTooltip={active !== null} />
    </div>
  );
}
