/**
 * 휴식/ACW 사유 코드 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - ReasonCode 변경 (create/update/delete/copy) → reasonList + tenantStats
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { ctiCodeApi } from '../api/ctiCodeApi';
import type {
  CtiCodeTenantStat,
  ReasonCodeCopyRequest,
  ReasonCodeCopyResult,
  ReasonCodeCreateRequest,
  ReasonCodeListParams,
  ReasonCodeResponse,
  ReasonCodeUpdateRequest,
} from '../types';

export const ctiCodeQueryKeys = createQueryKeys('cti-code', {
  tenantStats: null,
  reasonList: (params?: Record<string, unknown>) => [params],
  reasonDetail: (path?: Record<string, unknown>) => [path],
  reasonUsage: (params?: Record<string, unknown>) => [params],
});

// ─── Tenant Stats (상단 카드 슬라이더 — ADN 패턴) ──────────────────────────

export const useGetCtiCodeTenantStats = ({ queryOptions }: QueryHookOptions<CtiCodeTenantStat[]> = {}) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.tenantStats.queryKey,
    queryFn: () => ctiCodeApi.getTenantStats(),
    ...queryOptions,
  });

// ─── ReasonCode Queries ────────────────────────────────────────────────────

export const useGetReasonCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<ReasonCodeResponse[]> = {}) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.reasonList(params).queryKey,
    queryFn: () => ctiCodeApi.getReasonCodes(params as ReasonCodeListParams),
    ...queryOptions,
  });

export const useGetReasonCodeDetail = (
  path: { tenantId: number; codeType: number; reasonCode: number } | null | undefined,
  { queryOptions }: QueryHookOptions<ReasonCodeResponse> = {},
) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.reasonDetail(path ?? undefined).queryKey,
    queryFn: () => ctiCodeApi.getReasonCodeDetail(path!),
    enabled: !!path,
    ...queryOptions,
  });

// ─── ReasonCode Mutations ──────────────────────────────────────────────────

export const useCreateReasonCode = ({ mutationOptions }: MutationHookOptions<ReasonCodeResponse, ReasonCodeCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiCodeApi.createReasonCode(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.reasonList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.tenantStats.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateReasonCode = ({
  mutationOptions,
}: MutationHookOptions<ReasonCodeResponse, { path: { tenantId: number; codeType: number; reasonCode: number }; body: ReasonCodeUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, body }) => ctiCodeApi.updateReasonCode(path, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.reasonList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.reasonDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteReasonCode = ({ mutationOptions }: MutationHookOptions<void, { tenantId: number; codeType: number; reasonCode: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path) => ctiCodeApi.deleteReasonCode(path),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.reasonList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.tenantStats.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteReasonCodesBatch = ({ mutationOptions }: MutationHookOptions<void, { tenantId: number; codeType: number; reasonCode: number }[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paths) => ctiCodeApi.deleteReasonCodesBatch(paths),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.reasonList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.tenantStats.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useCopyReasonCodes = ({ mutationOptions }: MutationHookOptions<ReasonCodeCopyResult, ReasonCodeCopyRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiCodeApi.copyReasonCodes(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.reasonList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.tenantStats.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
