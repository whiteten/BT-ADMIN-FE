import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import { useNavigationStore } from '@/shared-store';
import { useCreateBookmark, useDeleteBookmark } from '../hooks/useBookmarkQueries';
import { IconStar } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  menuKey: string;
  label: string;
  path: string;
  appId: string;
  disabled?: boolean;
}

export const BookmarkButton = React.memo(({ menuKey, label, path, appId, disabled = false }: BookmarkButtonProps) => {
  const queryClient = useQueryClient();
  const { favorites } = useNavigationStore();
  const { mutate: createBookmark, isPending: isCreating } = useCreateBookmark({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });
  const { mutate: deleteBookmark, isPending: isDeleting } = useDeleteBookmark({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });
  const isBookmarked = favorites.some((bookmark) => bookmark.menuKey === menuKey);

  const handleToggleBookmark = useCallback(() => {
    if (isBookmarked) {
      deleteBookmark({ menuKey });
    } else {
      createBookmark({ params: {}, data: { menuKey } });
    }
  }, [createBookmark, deleteBookmark, isBookmarked, menuKey]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8 cursor-pointer hover:bg-transparent',
        isBookmarked ? 'text-[#FFA700] hover:text-[#FFA700]' : 'text-[#CED4DA] hover:text-[#FFA700] disabled:hover:text-[#CED4DA]',
      )}
      onClick={handleToggleBookmark}
      disabled={isCreating || isDeleting || disabled}
    >
      <IconStar className="size-5" fill={isBookmarked ? '#FFA700' : 'none'} />
      <span className="sr-only">즐겨찾기 토글</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
