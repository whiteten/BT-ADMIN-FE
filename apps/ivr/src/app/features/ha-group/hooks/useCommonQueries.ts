import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { commonApi } from '../api/commonApi';
import type { CodeItem } from '../types';

export const commonQueryKeys = createQueryKeys('haGroupCommon', {
  getCodesList: (params?: Record<string, unknown>) => [params],
});

export const useGetCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<CodeItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getCodesList(params).queryKey,
    queryFn: () => commonApi.getCodesList(params),
    ...queryOptions,
  });
};
