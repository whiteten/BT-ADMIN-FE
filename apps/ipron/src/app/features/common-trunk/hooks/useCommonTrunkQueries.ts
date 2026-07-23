/**
 * 공용 트렁크 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - 트렁크 변경 (create/update/delete) → trunks + nodes
 *  - 그룹DN 변경 (create/update/delete)  → gdns + nodes
 *  - 멤버 저장                           → members + gdns(배정 트렁크 수 보강) + trunks(배정상태)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { commonTrunkApi } from '../api/commonTrunkApi';
import type {
  AssignFilter,
  CommonGdnCreateRequest,
  CommonGdnResponse,
  CommonGdnUpdateRequest,
  CommonTrunkCreateRequest,
  CommonTrunkMemberResponse,
  CommonTrunkMemberSaveRequest,
  CommonTrunkMemberSaveResult,
  CommonTrunkNodeSummary,
  CommonTrunkResponse,
  CommonTrunkUpdateRequest,
} from '../types';

export const commonTrunkQueryKeys = createAppQueryKeys('common-trunk', {
  nodes: null,
  trunks: (nodeId?: number) => [nodeId],
  trunkDetail: (id?: number) => [id],
  gdns: (nodeId?: number, keyword?: string) => [nodeId, keyword],
  gdnDetail: (id?: number) => [id],
  members: (gdnId?: number, nodeId?: number, assignFilter?: AssignFilter) => [gdnId, nodeId, assignFilter],
  dnProfileOptions: (nodeId?: number) => [nodeId],
});

// ─── Queries ────────────────────────────────────────────────────────

export const useGetCommonTrunkNodes = ({ queryOptions }: QueryHookOptions<CommonTrunkNodeSummary[]> = {}) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.nodes.queryKey,
    queryFn: () => commonTrunkApi.getNodes(),
    ...queryOptions,
  });

export const useGetCommonTrunks = (nodeId: number | null | undefined, { queryOptions }: QueryHookOptions<CommonTrunkResponse[]> = {}) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.trunks(nodeId ?? undefined).queryKey,
    queryFn: () => commonTrunkApi.getTrunks(nodeId != null ? { nodeId } : undefined),
    ...queryOptions,
  });

export const useGetCommonTrunkDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<CommonTrunkResponse> = {}) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.trunkDetail(id ?? undefined).queryKey,
    queryFn: () => commonTrunkApi.getTrunkDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetCommonGdns = (nodeId: number | null | undefined, keyword: string | undefined, { queryOptions }: QueryHookOptions<CommonGdnResponse[]> = {}) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.gdns(nodeId ?? undefined, keyword || undefined).queryKey,
    queryFn: () => {
      const params: { nodeId?: number; keyword?: string } = {};
      if (nodeId != null) params.nodeId = nodeId;
      if (keyword) params.keyword = keyword;
      return commonTrunkApi.getGdns(Object.keys(params).length ? params : undefined);
    },
    ...queryOptions,
  });

export const useGetCommonGdnDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<CommonGdnResponse> = {}) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.gdnDetail(id ?? undefined).queryKey,
    queryFn: () => commonTrunkApi.getGdnDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetCommonTrunkMembers = (
  gdnId: number | null | undefined,
  nodeId: number | null | undefined,
  assignFilter: AssignFilter = 'all',
  { queryOptions }: QueryHookOptions<CommonTrunkMemberResponse[]> = {},
) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.members(gdnId ?? undefined, nodeId ?? undefined, assignFilter).queryKey,
    queryFn: () => commonTrunkApi.getMembers({ gdnId: gdnId as number, nodeId: nodeId as number, assignFilter }),
    enabled: gdnId != null && nodeId != null,
    ...queryOptions,
  });

// ─── Mutations ──────────────────────────────────────────────────────

export const useCreateCommonTrunk = ({ mutationOptions }: MutationHookOptions<CommonTrunkResponse, CommonTrunkCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => commonTrunkApi.createTrunk(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.trunks._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.nodes.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCommonTrunk = ({ mutationOptions }: MutationHookOptions<CommonTrunkResponse, { id: number; body: CommonTrunkUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => commonTrunkApi.updateTrunk(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.trunks._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.trunkDetail._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.nodes.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCommonTrunks = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => commonTrunkApi.deleteTrunks(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.trunks._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.nodes.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useCreateCommonGdn = ({ mutationOptions }: MutationHookOptions<CommonGdnResponse, CommonGdnCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => commonTrunkApi.createGdn(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.gdns._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCommonGdn = ({ mutationOptions }: MutationHookOptions<CommonGdnResponse, { id: number; body: CommonGdnUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => commonTrunkApi.updateGdn(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.gdns._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.gdnDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCommonGdns = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => commonTrunkApi.deleteGdns(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.gdns._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** 갭1: 내선프로파일 옵션 — 노드 선택 시 TRUNK 타입 목록 로드 (SWAT cbCreate p4DnProfileId 정합) */
export const useGetCommonTrunkDnProfileOptions = (nodeId: number | null | undefined, { queryOptions }: QueryHookOptions<{ dnProfileId: number; dnProfileName: string }[]> = {}) =>
  useQuery({
    queryKey: commonTrunkQueryKeys.dnProfileOptions(nodeId ?? undefined).queryKey,
    queryFn: () => commonTrunkApi.getDnProfileOptions(nodeId as number),
    enabled: nodeId != null,
    ...queryOptions,
  });

export const useSaveCommonTrunkMembers = ({ mutationOptions }: MutationHookOptions<CommonTrunkMemberSaveResult, CommonTrunkMemberSaveRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => commonTrunkApi.saveMembers(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.members._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.gdns._def });
      qc.invalidateQueries({ queryKey: commonTrunkQueryKeys.trunks._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
