/**
 * 화면 지정 React Query 훅.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { type PageMapping, type PageMappingUpsertRequest, sharedApi } from '@/shared-api';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';

export const pageMappingQueryKeys = sharedApi.pageMapping.queryKeys;

/**
 * 전체 화면 지정 조회 훅
 */
export const useGetPageMappings = ({ queryOptions }: QueryHookOptions<PageMapping[]> = {}) => {
  return useQuery({
    queryKey: pageMappingQueryKeys.getPageMappings.queryKey,
    queryFn: sharedApi.pageMapping.getPageMappings,
    ...queryOptions,
  });
};

/**
 * 화면 지정 upsert 훅 (없으면 생성, 있으면 갱신)
 */
export const useUpsertPageMapping = ({ mutationOptions }: MutationHookOptions<PageMapping, PageMappingUpsertRequest> = {}) => {
  return useMutation({
    mutationFn: sharedApi.pageMapping.upsertPageMapping,
    ...mutationOptions,
  });
};

/**
 * 화면 지정 삭제 훅 (기본 화면으로 복원)
 */
export const useDeletePageMapping = ({ mutationOptions }: MutationHookOptions<void, { appId: string; path: string }> = {}) => {
  return useMutation({
    mutationFn: sharedApi.pageMapping.deletePageMapping,
    ...mutationOptions,
  });
};
