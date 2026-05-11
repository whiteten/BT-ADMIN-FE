import { useMemo } from 'react';
import { useNavigationStore } from '@/shared-store';
import BookmarkChip from './BookmarkChip';
import BookmarkOverflowMenu from './BookmarkOverflowMenu';
import { useOverflowItems } from '../hooks/useOverflowItems';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';

const RESERVED_OVERFLOW_WIDTH = 64;

export default function BookmarkBar() {
  const { favorites } = useNavigationStore();

  const sorted = useMemo(() => [...favorites].sort((a, b) => a.sortOrder - b.sortOrder), [favorites]);
  const { containerRef, measureRef, visibleItems, overflowItems } = useOverflowItems<Bookmark>(sorted, RESERVED_OVERFLOW_WIDTH);

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
        {visibleItems.map((bookmark) => (
          <BookmarkChip key={bookmark.menuKey} bookmark={bookmark} />
        ))}
        {overflowItems.length > 0 && <BookmarkOverflowMenu bookmarks={overflowItems} />}
      </div>
    </div>
  );
}
