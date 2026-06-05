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
  /** true면 아이콘 + "즐겨찾기"/"즐겨찾기 해제" 텍스트의 큰 버튼으로 렌더(스플릿 프리뷰 패널용). 기본 false는 아이콘 버튼. */
  labeled?: boolean;
}

export const FavoriteButton = React.memo(({ menuKey, label, path, appId, disabled = false, labeled = false }: FavoriteButtonProps) => {
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

  if (labeled) {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn(
          'h-9 cursor-pointer gap-1.5 px-3.5 text-[13px] hover:bg-white',
          isFavorited ? 'border-[#FFA700] text-[#FFA700] hover:text-[#FFA700]' : 'text-[#495057] hover:border-[#FFA700] hover:text-[#FFA700]',
        )}
        onClick={handleToggleFavorite}
        disabled={isCreating || isDeleting || disabled}
      >
        <IconStar className="size-4" fill={isFavorited ? '#FFA700' : 'none'} />
        {isFavorited ? '즐겨찾기 해제' : '즐겨찾기'}
      </Button>
    );
  }

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
