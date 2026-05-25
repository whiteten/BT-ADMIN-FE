/**
 * CTI 코드 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - ReasonCode 변경 (create/update/delete/copy) → reasonList + categories(itemCount)
 *  - MediaType 변경 (create/update) → mediaList(classCd) + categories(itemCount)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { ctiCodeApi } from '../api/ctiCodeApi';
import type {
  CtiCodeCategory,
  MediaTypeListParams,
  MediaTypeResponse,
  MediaTypeUpsertRequest,
  ReasonCodeCopyRequest,
  ReasonCodeCopyResult,
  ReasonCodeCreateRequest,
  ReasonCodeListParams,
  ReasonCodeResponse,
  ReasonCodeUpdateRequest,
} from '../types';

export const ctiCodeQueryKeys = createQueryKeys('cti-code', {
  categories: (params?: Record<string, unknown>) => [params],
  reasonList: (params?: Record<string, unknown>) => [params],
  reasonDetail: (path?: Record<string, unknown>) => [path],
  reasonUsage: (params?: Record<string, unknown>) => [params],
  mediaList: (params?: Record<string, unknown>) => [params],
  mediaDetail: (path?: Record<string, unknown>) => [path],
  mediaUsage: (classCd?: string) => [classCd],
});

// ─── Categories ────────────────────────────────────────────────────────────

export const useGetCtiCodeCategories = ({ params, queryOptions }: QueryHookWithParamsOptions<CtiCodeCategory[]> = {}) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.categories(params).queryKey,
    queryFn: () => ctiCodeApi.getCategories(params),
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
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.categories._def });
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
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.categories._def });
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
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.categories._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── MediaType Queries ─────────────────────────────────────────────────────

export const useGetMediaTypes = ({ params, queryOptions }: QueryHookWithParamsOptions<MediaTypeResponse[]> = {}) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.mediaList(params).queryKey,
    queryFn: () => ctiCodeApi.getMediaTypes(params as MediaTypeListParams),
    ...queryOptions,
  });

export const useGetMediaTypeDetail = (path: { classCd: string; codeCd: string } | null | undefined, { queryOptions }: QueryHookOptions<MediaTypeResponse> = {}) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.mediaDetail(path ?? undefined).queryKey,
    queryFn: () => ctiCodeApi.getMediaTypeDetail(path!),
    enabled: !!path,
    ...queryOptions,
  });

export const useGetMediaTypeUsage = (classCd: string | null | undefined, { queryOptions }: QueryHookOptions<string[]> = {}) =>
  useQuery({
    queryKey: ctiCodeQueryKeys.mediaUsage(classCd ?? undefined).queryKey,
    queryFn: () => ctiCodeApi.getMediaTypeUsage(classCd as string),
    enabled: !!classCd,
    ...queryOptions,
  });

// ─── MediaType Mutations ───────────────────────────────────────────────────

export const useCreateMediaType = ({ mutationOptions }: MutationHookOptions<MediaTypeResponse, MediaTypeUpsertRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiCodeApi.createMediaType(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.mediaList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.categories._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateMediaType = ({
  mutationOptions,
}: MutationHookOptions<MediaTypeResponse, { path: { classCd: string; codeCd: string }; body: MediaTypeUpsertRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, body }) => ctiCodeApi.updateMediaType(path, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.mediaList._def });
      qc.invalidateQueries({ queryKey: ctiCodeQueryKeys.mediaDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
