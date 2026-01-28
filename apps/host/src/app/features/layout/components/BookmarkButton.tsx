import React, { useCallback } from 'react';
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
import { Button } from '@/components/ui/button';

interface BookmarkButtonProps {
  menuKey: string;
  label: string;
  path: string;
  appId: string;
}

export const BookmarkButton = React.memo(({ menuKey, label, path, appId }: BookmarkButtonProps) => {
  const isFav = false;

  const handleToggleBookmark = useCallback(() => {
    console.log(`toggle bookmark: menuKey=${menuKey}, label=${label}, path=${path}, appId=${appId}`);
  }, [menuKey, label, path, appId]);

  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleToggleBookmark}>
      <IconBookmark className="size-5" fill={isFav ? 'var(--color-bt-primary)' : 'none'} color={isFav ? 'var(--color-bt-primary)' : '#495057'} />
      <span className="sr-only">Toggle bookmark</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
