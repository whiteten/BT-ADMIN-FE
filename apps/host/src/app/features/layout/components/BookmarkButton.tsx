import React, { useCallback } from 'react';
import { Star } from 'lucide-react';
import { useBookmarkStore } from '@/shared-store';
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
      <Star className="h-4 w-4" fill={isFav ? '#facc15' : 'none'} color={isFav ? '#facc15' : 'currentColor'} />
      <span className="sr-only">Toggle favorite</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
