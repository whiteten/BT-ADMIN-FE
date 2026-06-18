/**
 * BSR 그룹별 CTI큐 배정 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { bsrCtiqMappingApi } from '../api/bsrCtiqMappingApi';
import type { BsrCtiqAssignRequest, BsrCtiqMappingResponse, BsrCtiqMappingUpdateRequest } from '../types';

export const bsrCtiqQueryKeys = createQueryKeys('bsr-ctiq-mappings', {
  getList: (bsrGroupId?: number, tenantId?: number) => [bsrGroupId, tenantId],
  searchCtiq: (params?: Record<string, unknown>) => [params],
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetBsrCtiqMappings = (
  bsrGroupId: number | null | undefined,
  tenantId: number | null | undefined,
  { queryOptions }: QueryHookOptions<BsrCtiqMappingResponse[]> = {},
) =>
  useQuery({
    queryKey: bsrCtiqQueryKeys.getList(bsrGroupId ?? undefined, tenantId ?? undefined).queryKey,
    queryFn: () => bsrCtiqMappingApi.getList(bsrGroupId as number, tenantId as number),
    enabled: !!bsrGroupId && !!tenantId,
    ...queryOptions,
  });

// ─── Mutations ───────────────────────────────────────────────────────────────

export const useUpdateBsrCtiqMappings = ({ mutationOptions }: MutationHookOptions<void, { bsrGroupId: number; body: BsrCtiqMappingUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bsrGroupId, body }) => bsrCtiqMappingApi.updateMappings(bsrGroupId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrCtiqQueryKeys.getList().queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAssignBsrCtiq = ({ mutationOptions }: MutationHookOptions<void, BsrCtiqAssignRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BsrCtiqAssignRequest) => bsrCtiqMappingApi.assignCtiq(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrCtiqQueryKeys.getList().queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
