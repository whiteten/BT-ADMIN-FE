/**
 * IR 업무시간 관리 TanStack Query 훅.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { irWorktimeApi } from '../api/irWorktimeApi';
import type { IrWorktime, IrWorktimeTenantStat } from '../types';

export const irWorktimeQueryKeys = createAppQueryKeys('ir-worktime', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getTenantStats: null,
});

/** 테넌트별 통계 (카드 슬라이더) */
export const useGetIrWorktimeTenantStats = ({ queryOptions }: QueryHookOptions<IrWorktimeTenantStat[]> = {}) => {
  return useQuery({
    queryKey: irWorktimeQueryKeys.getTenantStats.queryKey,
    queryFn: () => irWorktimeApi.getTenantStats(),
    ...queryOptions,
  });
};

/** IR 업무시간 목록 */
export const useGetIrWorktimes = ({ params, queryOptions }: QueryHookWithParamsOptions<IrWorktime[]> = {}) => {
  return useQuery({
    queryKey: irWorktimeQueryKeys.getList(params).queryKey,
    queryFn: () => irWorktimeApi.getList(params),
    ...queryOptions,
  });
};

/** IR 업무시간 등록 */
export const useCreateIrWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: irWorktimeApi.create, ...mutationOptions });
};

/** IR 업무시간 수정 */
export const useUpdateIrWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: irWorktimeApi.update, ...mutationOptions });
};

/** IR 업무시간 삭제 */
export const useDeleteIrWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: irWorktimeApi.remove, ...mutationOptions });
};
