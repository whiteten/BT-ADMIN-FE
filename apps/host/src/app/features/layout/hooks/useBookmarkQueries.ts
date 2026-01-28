import { useMutation } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import type { MutationHookOptions } from '@/shared-util';

export const useCreateBookmark = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sharedApi.bookmark.createBookmark,
    ...mutationOptions,
  });
};

export const useUpdateBookmark = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sharedApi.bookmark.updateBookmark,
    ...mutationOptions,
  });
};

export const useDeleteBookmark = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sharedApi.bookmark.deleteBookmark,
    ...mutationOptions,
  });
};
