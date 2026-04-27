import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import { useNavigationStore } from '@/shared-store';
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
import { useCreateBookmark, useDeleteBookmark } from '../hooks/useBookmarkQueries';
import { Button } from '@/components/ui/button';

interface BookmarkButtonProps {
  menuKey: string;
  label: string;
  path: string;
  appId: string;
}

export const BookmarkButton = React.memo(({ menuKey, label, path, appId }: BookmarkButtonProps) => {
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
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleToggleBookmark} disabled={isCreating || isDeleting}>
      <IconBookmark className="size-5" fill={isBookmarked ? 'var(--color-bt-primary)' : 'none'} color={isBookmarked ? 'var(--color-bt-primary)' : '#495057'} />
      <span className="sr-only">Toggle bookmark</span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
