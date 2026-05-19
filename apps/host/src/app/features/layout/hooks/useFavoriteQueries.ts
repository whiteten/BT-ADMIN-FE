import { useMutation } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import type { MutationHookOptions } from '@/shared-util';

export const useCreateFavorite = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sharedApi.favorite.createFavorite,
    ...mutationOptions,
  });
};

export const useUpdateFavorite = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sharedApi.favorite.updateFavorite,
    ...mutationOptions,
  });
};

export const useDeleteFavorite = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sharedApi.favorite.deleteFavorite,
    ...mutationOptions,
  });
};
