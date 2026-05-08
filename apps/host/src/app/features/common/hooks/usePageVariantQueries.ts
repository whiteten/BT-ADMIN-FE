import { useQuery } from '@tanstack/react-query';
import { type PageVariant, sharedApi } from '@/shared-api';
import type { QueryHookOptions } from '@/shared-util';

/**
 * 화면 지정 목록 조회 (host용 wrapper).
 *
 * manager의 동일 query hook과 같은 query key를 사용하므로 React Query 캐시가 공유된다.
 * → host가 부팅 시 한 번 받아두면 manager의 관리 화면 진입 시 추가 호출이 발생하지 않는다.
 */
export const useGetPageVariants = ({ queryOptions }: QueryHookOptions<PageVariant[]> = {}) => {
  return useQuery({
    queryKey: sharedApi.pageVariant.queryKeys.getPageVariants.queryKey,
    queryFn: sharedApi.pageVariant.getPageVariants,
    ...queryOptions,
  });
};
