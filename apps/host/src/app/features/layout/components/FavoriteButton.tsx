import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import { useNavigationStore } from '@/shared-store';
import { useCreateFavorite, useDeleteFavorite } from '../hooks/useFavoriteQueries';
import { IconStar } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  menuKey: string;
  label: string;
  path: string;
  appId: string;
  disabled?: boolean;
}

export const FavoriteButton = React.memo(({ menuKey, label, path, appId, disabled = false }: FavoriteButtonProps) => {
  const queryClient = useQueryClient();
  const { favorites } = useNavigationStore();
  const { mutate: createFavorite, isPending: isCreating } = useCreateFavorite({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });
  const { mutate: deleteFavorite, isPending: isDeleting } = useDeleteFavorite({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });
  const isFavorited = favorites.some((favorite) => favorite.menuKey === menuKey);

  const handleToggleFavorite = useCallback(() => {
    if (isFavorited) {
      deleteFavorite({ menuKey });
    } else {
      createFavorite({ params: {}, data: { menuKey } });
    }
  }, [createFavorite, deleteFavorite, isFavorited, menuKey]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8 cursor-pointer hover:bg-transparent',
        isFavorited ? 'text-[#FFA700] hover:text-[#FFA700]' : 'text-[#CED4DA] hover:text-[#FFA700] disabled:hover:text-[#CED4DA]',
      )}
      onClick={handleToggleFavorite}
      disabled={isCreating || isDeleting || disabled}
    >
      <IconStar className="size-5" fill={isFavorited ? '#FFA700' : 'none'} />
      <span className="sr-only">즐겨찾기 토글</span>
    </Button>
  );
});

FavoriteButton.displayName = 'FavoriteButton';
