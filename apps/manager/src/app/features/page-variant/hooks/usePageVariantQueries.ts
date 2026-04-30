/**
 * 화면 지정 React Query 훅.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { type PageVariant, type PageVariantUpsertRequest, sharedApi } from '@/shared-api';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';

export const pageVariantQueryKeys = sharedApi.pageVariant.queryKeys;

/**
 * 전체 화면 지정 조회 훅
 */
export const useGetPageVariants = ({ queryOptions }: QueryHookOptions<PageVariant[]> = {}) => {
  return useQuery({
    queryKey: pageVariantQueryKeys.getPageVariants.queryKey,
    queryFn: sharedApi.pageVariant.getPageVariants,
    ...queryOptions,
  });
};

/**
 * 화면 지정 upsert 훅 (없으면 생성, 있으면 갱신)
 */
export const useUpsertPageVariant = ({ mutationOptions }: MutationHookOptions<PageVariant, PageVariantUpsertRequest> = {}) => {
  return useMutation({
    mutationFn: sharedApi.pageVariant.upsertPageVariant,
    ...mutationOptions,
  });
};

/**
 * 화면 지정 삭제 훅 (기본 화면으로 복원)
 */
export const useDeletePageVariant = ({ mutationOptions }: MutationHookOptions<void, { appId: string; path: string }> = {}) => {
  return useMutation({
    mutationFn: sharedApi.pageVariant.deletePageVariant,
    ...mutationOptions,
  });
};
