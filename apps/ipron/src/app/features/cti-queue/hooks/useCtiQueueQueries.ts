/**
 * CTI 큐 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - create/update/delete → getList + getTenants
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { ctiQueueApi } from '../api/ctiQueueApi';
import type { CtiQueueCreateRequest, CtiQueueResponse, CtiQueueTenantStat, CtiQueueUpdateRequest } from '../types';

export const ctiQueueQueryKeys = createQueryKeys('cti-queue', {
  getList: null,
  getDetail: (ctiqId?: number) => [ctiqId],
  getTenants: null,
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetCtiQueues = ({ queryOptions }: QueryHookOptions<CtiQueueResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getList.queryKey,
    queryFn: () => ctiQueueApi.getList(),
    ...queryOptions,
  });

export const useGetCtiQueueDetail = (ctiqId: number | null | undefined, { queryOptions }: QueryHookOptions<CtiQueueResponse> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getDetail(ctiqId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getDetail(ctiqId as number),
    enabled: !!ctiqId,
    ...queryOptions,
  });

export const useGetCtiQueueTenants = ({ queryOptions }: QueryHookOptions<CtiQueueTenantStat[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getTenants.queryKey,
    queryFn: () => ctiQueueApi.getTenants(),
    ...queryOptions,
  });

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateCtiQueue = ({ mutationOptions }: MutationHookOptions<CtiQueueResponse, CtiQueueCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiQueueApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList.queryKey });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCtiQueue = ({ mutationOptions }: MutationHookOptions<CtiQueueResponse, { ctiqId: number; body: CtiQueueUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ctiqId, body }) => ctiQueueApi.update(ctiqId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList.queryKey });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCtiQueue = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ctiqId) => ctiQueueApi.delete(ctiqId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList.queryKey });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
