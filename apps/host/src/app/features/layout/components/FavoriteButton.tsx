import React, { useCallback } from 'react';
import { Star } from 'lucide-react';
import { useFavoriteMenuStore } from '@/shared-store';
import { Button } from '@/components/ui/button';

interface FavoriteButtonProps {
  menuId: string;
  label: string;
  path: string;
  rootPath: string;
}

export const FavoriteButton = React.memo(({ menuId, label, path, rootPath }: FavoriteButtonProps) => {
  const { toggleFavorite, isFavorite } = useFavoriteMenuStore();
  const isFav = isFavorite(menuId);

  const handleToggle = useCallback(() => {
    toggleFavorite(rootPath, menuId, label, path);
  }, [menuId, label, path, rootPath, toggleFavorite]);

  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleToggle}>
      <Star className="h-4 w-4" fill={isFav ? '#facc15' : 'none'} color={isFav ? '#facc15' : 'currentColor'} />
      <span className="sr-only">Toggle favorite</span>
    </Button>
  );
});

FavoriteButton.displayName = 'FavoriteButton';
