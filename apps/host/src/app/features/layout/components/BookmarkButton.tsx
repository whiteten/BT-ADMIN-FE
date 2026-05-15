import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import { useNavigationStore } from '@/shared-store';
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
import { useCreateBookmark, useDeleteBookmark } from '../hooks/useBookmarkQueries';
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
        isBookmarked ? 'text-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]' : 'text-[#495057] hover:text-[var(--color-bt-primary)] disabled:hover:text-[#495057]',
      )}
      onClick={handleToggleBookmark}
      disabled={isCreating || isDeleting || disabled}
    >
      <IconBookmark className="size-5" fill={isBookmarked ? 'var(--color-bt-primary)' : 'none'} />
      <span className="sr-only">Toggle bookmark</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
