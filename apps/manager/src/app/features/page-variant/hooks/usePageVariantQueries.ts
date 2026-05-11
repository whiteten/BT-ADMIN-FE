/**
 * 화면 지정 React Query 훅.
 *
 * 조회는 host에서 부팅 시 useGetPageVariants(host용 wrapper)로 한 번 수행되며
 * 결과가 usePageVariantsStore에 적재된다. manager의 화면들은 store만 read하고,
 * 여기서는 mutation 훅과 invalidate용 query key만 노출한다.
 */
import { useMutation } from '@tanstack/react-query';
import { type PageVariant, type PageVariantUpsertRequest, sharedApi } from '@/shared-api';
import type { MutationHookOptions } from '@/shared-util';

export const pageVariantQueryKeys = sharedApi.pageVariant.queryKeys;

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
