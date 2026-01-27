import React, { useCallback } from 'react';
import { useBookmarkStore } from '@/shared-store';
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
import { Button } from '@/components/ui/button';

interface BookmarkButtonProps {
  menuKey: string;
  label: string;
  path: string;
  appId: string;
}

export const BookmarkButton = React.memo(({ menuKey, label, path, appId }: BookmarkButtonProps) => {
  const { toggleBookmark, isBookmarked } = useBookmarkStore();
  const isFav = isBookmarked(menuKey);

  const handleToggle = useCallback(() => {
    toggleBookmark(appId, menuKey, label, path);
  }, [menuKey, label, path, appId, toggleBookmark]);

  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleToggle}>
      <IconBookmark className="size-5" fill={isFav ? 'var(--color-bt-primary)' : 'none'} color={isFav ? 'var(--color-bt-primary)' : '#495057'} />
      <span className="sr-only">Toggle favorite</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
