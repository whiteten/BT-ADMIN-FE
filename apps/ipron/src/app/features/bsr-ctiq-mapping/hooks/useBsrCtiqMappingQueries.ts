/**
 * BSR 그룹별 CTI큐 배정 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { bsrCtiqMappingApi } from '../api/bsrCtiqMappingApi';
import type { BsrCtiqAssignRequest, BsrCtiqMappingResponse, BsrCtiqMappingUpdateRequest, BsrCtiqSearchParams, BsrCtiqSearchResult, BsrCtiqUnassignRequest } from '../types';

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

/**
 * CTI큐 배정 팝업 검색 뮤테이션 (imperative — 버튼 클릭 시 호출).
 * useQuery 가 아닌 useMutation 으로 구현: "검색" 버튼 클릭 시 실행, 자동 재실행 없음.
 */
export const useSearchBsrCtiq = ({ mutationOptions }: MutationHookOptions<BsrCtiqSearchResult, BsrCtiqSearchParams> = {}) =>
  useMutation({
    mutationFn: (params: BsrCtiqSearchParams) => bsrCtiqMappingApi.searchCtiq(params),
    ...mutationOptions,
  });

/**
 * CTI큐 배정 해제 뮤테이션 (v2 신설 — PLAN §2-2).
 */
export const useUnassignBsrCtiq = ({ mutationOptions }: MutationHookOptions<void, { bsrGroupId: number; body: BsrCtiqUnassignRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bsrGroupId, body }) => bsrCtiqMappingApi.unassignCtiq(bsrGroupId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrCtiqQueryKeys.getList().queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
