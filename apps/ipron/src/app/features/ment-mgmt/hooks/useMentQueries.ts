/**
 * 교환기 멘트 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - create/update/delete/batch → getList + getOptions
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { mentApi } from '../api/mentApi';
import type { MentBatchCreateRequest, MentCreateRequest, MentOptionItem, MentResponse, MentSyncResult, MentUpdateRequest } from '../types';

export const mentQueryKeys = createAppQueryKeys('ment', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (mentId?: number) => [mentId],
  options: (nodeId?: number, tenantId?: number) => [nodeId, tenantId],
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetMents = ({ params, queryOptions }: QueryHookWithParamsOptions<MentResponse[]> = {}) =>
  useQuery({
    queryKey: mentQueryKeys.getList(params).queryKey,
    queryFn: () => mentApi.getList(params),
    ...queryOptions,
  });

export const useGetMentDetail = (mentId: number | null | undefined, { queryOptions }: QueryHookOptions<MentResponse> = {}) =>
  useQuery({
    queryKey: mentQueryKeys.getDetail(mentId ?? undefined).queryKey,
    queryFn: () => mentApi.getDetail(mentId as number),
    enabled: !!mentId,
    ...queryOptions,
  });

/**
 * 멘트 콤보 옵션 (노드+테넌트 단위) — CTI큐 초기구성 멘트 콤보 등 재사용.
 * 노드가 없으면(미선택) 조회 비활성.
 */
export const useGetMentOptions = (nodeId: number | null | undefined, tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<MentOptionItem[]> = {}) =>
  useQuery({
    queryKey: mentQueryKeys.options(nodeId ?? undefined, tenantId ?? undefined).queryKey,
    queryFn: () => mentApi.getOptions({ ...(nodeId != null ? { nodeId } : {}), ...(tenantId != null ? { tenantId } : {}) }),
    enabled: nodeId != null,
    ...queryOptions,
  });

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateMent = ({ mutationOptions }: MutationHookOptions<MentResponse, MentCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => mentApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mentQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: mentQueryKeys.options._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateMent = ({ mutationOptions }: MutationHookOptions<MentResponse, { mentId: number; body: MentUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mentId, body }) => mentApi.update(mentId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mentQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: mentQueryKeys.getDetail._def });
      qc.invalidateQueries({ queryKey: mentQueryKeys.options._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteMents = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mentIds) => mentApi.deleteBatch(mentIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mentQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: mentQueryKeys.options._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useCreateMentBatch = ({ mutationOptions }: MutationHookOptions<MentResponse[], MentBatchCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => mentApi.createBatch(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: mentQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: mentQueryKeys.options._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useSyncMents = ({ mutationOptions }: MutationHookOptions<MentSyncResult, number> = {}) =>
  useMutation({
    mutationFn: (nodeId) => mentApi.sync(nodeId),
    ...mutationOptions,
  });
