import React, { useCallback } from 'react';
import { useBookmarkStore } from '@/shared-store';
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
import { Button } from '@/components/ui/button';

interface BookmarkButtonProps {
  menuId: string;
  label: string;
  path: string;
  rootPath: string;
}

export const BookmarkButton = React.memo(({ menuId, label, path, rootPath }: BookmarkButtonProps) => {
  const { toggleBookmark, isBookmarked } = useBookmarkStore();
  const isFav = isBookmarked(menuId);

  const handleToggle = useCallback(() => {
    toggleBookmark(rootPath, menuId, label, path);
  }, [menuId, label, path, rootPath, toggleBookmark]);

  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleToggle}>
      <IconBookmark className="size-5" fill={isFav ? 'var(--color-bt-primary)' : 'none'} color={isFav ? 'var(--color-bt-primary)' : '#495057'} />
      <span className="sr-only">Toggle favorite</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
