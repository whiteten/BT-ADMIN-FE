/**
 * IE 업무시간 관리 TanStack Query 훅 (마스터 + 슬롯).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { ieWorktimeApi } from '../api/ieWorktimeApi';
import type { IeWorktimeMaster, IeWorktimeSlot, IeWorktimeTenantStat } from '../types';

export const ieWorktimeQueryKeys = createAppQueryKeys('ie-worktime', {
  getList: (params?: Record<string, unknown>) => [params],
  getSlots: (id?: number) => [id],
  getTenantStats: null,
});

// ─── 테넌트 통계 ─────────────────────────────────────────
export const useGetIeWorktimeTenantStats = ({ queryOptions }: QueryHookOptions<IeWorktimeTenantStat[]> = {}) => {
  return useQuery({
    queryKey: ieWorktimeQueryKeys.getTenantStats.queryKey,
    queryFn: () => ieWorktimeApi.getTenantStats(),
    ...queryOptions,
  });
};

// ─── 마스터 ──────────────────────────────────────────────
export const useGetIeWorktimes = ({ params, queryOptions }: QueryHookWithParamsOptions<IeWorktimeMaster[]> = {}) => {
  return useQuery({
    queryKey: ieWorktimeQueryKeys.getList(params).queryKey,
    queryFn: () => ieWorktimeApi.getList(params),
    ...queryOptions,
  });
};

export const useCreateIeWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: ieWorktimeApi.create, ...mutationOptions });
};

export const useUpdateIeWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: ieWorktimeApi.update, ...mutationOptions });
};

export const useDeleteIeWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: ieWorktimeApi.remove, ...mutationOptions });
};

// ─── 슬롯 ────────────────────────────────────────────────
export const useGetIeWorktimeSlots = (id?: number, { queryOptions }: QueryHookOptions<IeWorktimeSlot[]> = {}) => {
  return useQuery({
    queryKey: ieWorktimeQueryKeys.getSlots(id).queryKey,
    queryFn: () => ieWorktimeApi.getSlots(id as number),
    enabled: !!id,
    ...queryOptions,
  });
};

export const useCreateIeWorktimeSlot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: ieWorktimeApi.createSlot, ...mutationOptions });
};

export const useUpdateIeWorktimeSlot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: ieWorktimeApi.updateSlot, ...mutationOptions });
};

export const useDeleteIeWorktimeSlot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: ieWorktimeApi.removeSlot, ...mutationOptions });
};
