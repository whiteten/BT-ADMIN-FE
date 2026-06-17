/**
 * 미디어타입 사용처 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { mediaTypeApi } from '../api/mediaTypeApi';
import type { MediaTypeMetaOption, MediaTypeResponse, MediaTypeUpsertRequest } from '../types';

export const mediaTypeQueryKeys = createQueryKeys('media-type', {
  list: null,
  meta: null,
  detail: (mediaType?: number) => [mediaType],
});

export const useGetMediaTypes = ({ queryOptions }: QueryHookOptions<MediaTypeResponse[]> = {}) =>
  useQuery({
    queryKey: mediaTypeQueryKeys.list.queryKey,
    queryFn: () => mediaTypeApi.getMediaTypes(),
    ...queryOptions,
  });

export const useGetMediaTypeMeta = ({ queryOptions }: QueryHookOptions<MediaTypeMetaOption[]> = {}) =>
  useQuery({
    queryKey: mediaTypeQueryKeys.meta.queryKey,
    queryFn: () => mediaTypeApi.getMediaTypeMeta(),
    ...queryOptions,
  });

export const useCreateMediaType = ({ mutationOptions }: MutationHookOptions<MediaTypeResponse, MediaTypeUpsertRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => mediaTypeApi.createMediaType(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.list.queryKey });
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.meta.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateMediaType = ({ mutationOptions }: MutationHookOptions<MediaTypeResponse, { mediaType: number; body: MediaTypeUpsertRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaType, body }) => mediaTypeApi.updateMediaType(mediaType, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.list.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteMediaType = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaType) => mediaTypeApi.deleteMediaType(mediaType),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.list.queryKey });
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.meta.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/**
 * 미디어타입 일괄 삭제 (벌크 1콜)
 */
export const useDeleteMediaTypeBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaTypes) => mediaTypeApi.deleteMediaTypeBatch(mediaTypes),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.list.queryKey });
      qc.invalidateQueries({ queryKey: mediaTypeQueryKeys.meta.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
