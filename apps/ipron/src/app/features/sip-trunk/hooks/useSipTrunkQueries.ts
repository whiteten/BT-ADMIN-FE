/**
 * SIP 트렁크(테넌트) React Query 훅.
 *
 * invalidate 매트릭스:
 *  - 그룹DN 변경 → gdnList
 *  - 트렁크 변경 → trunkList + trunkNodes + memberList (배정 영향)
 *  - 멤버 저장 → memberList + gdnList (배정 트렁크 수)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { sipTrunkApi } from '../api/sipTrunkApi';
import type {
  ChannelUsage,
  SipGdnCreateRequest,
  SipGdnResponse,
  SipGdnUpdateRequest,
  SipTrunkCreateRequest,
  SipTrunkMemberResponse,
  SipTrunkMemberSaveRequest,
  SipTrunkMemberSaveResult,
  SipTrunkNodeSummary,
  SipTrunkResponse,
  SipTrunkUpdateRequest,
  TenantScope,
} from '../types';

export const sipTrunkQueryKeys = createAppQueryKeys('sip-trunk', {
  gdnList: (params?: Record<string, unknown>) => [params],
  gdnDetail: (gdnId?: number) => [gdnId],
  trunkList: (params?: Record<string, unknown>) => [params],
  trunkNodes: (params?: Record<string, unknown>) => [params],
  trunkDetail: (sipTrunkId?: number) => [sipTrunkId],
  channelUsage: (ids?: number[]) => [ids],
  memberList: (params?: Record<string, unknown>) => [params],
  dnProfileOptions: (nodeId?: number) => [nodeId],
});

// ─── 그룹DN ──────────────────────────────────────────────────────────

export const useGetSipGdns = ({ params, queryOptions }: QueryHookWithParamsOptions<SipGdnResponse[]> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.gdnList(params).queryKey,
    queryFn: () => sipTrunkApi.getGdnList(params),
    ...queryOptions,
  });

export const useGetSipGdnDetail = (gdnId: number | null | undefined, { queryOptions }: QueryHookOptions<SipGdnResponse> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.gdnDetail(gdnId ?? undefined).queryKey,
    queryFn: () => sipTrunkApi.getGdnDetail(gdnId as number),
    enabled: !!gdnId,
    ...queryOptions,
  });

export const useCreateSipGdn = ({ mutationOptions }: MutationHookOptions<SipGdnResponse, SipGdnCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => sipTrunkApi.createGdn(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.gdnList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSipGdn = ({ mutationOptions }: MutationHookOptions<SipGdnResponse, { gdnId: number; body: SipGdnUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gdnId, body }) => sipTrunkApi.updateGdn(gdnId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.gdnList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.gdnDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSipGdns = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => sipTrunkApi.deleteGdnBatch(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.gdnList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.memberList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 트렁크 마스터 ───────────────────────────────────────────────────

export const useGetSipTrunks = ({ params, queryOptions }: QueryHookWithParamsOptions<SipTrunkResponse[]> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.trunkList(params).queryKey,
    queryFn: () => sipTrunkApi.getTrunkList(params),
    ...queryOptions,
  });

export const useGetSipTrunkNodes = ({ params, queryOptions }: QueryHookWithParamsOptions<SipTrunkNodeSummary[]> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.trunkNodes(params).queryKey,
    queryFn: () => sipTrunkApi.getTrunkNodes(params),
    ...queryOptions,
  });

export const useGetSipTrunkChannelUsage = (sipTrunkIds: number[], { queryOptions }: QueryHookOptions<ChannelUsage[]> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.channelUsage(sipTrunkIds).queryKey,
    queryFn: () => sipTrunkApi.getChannelUsage(sipTrunkIds),
    enabled: sipTrunkIds.length > 0,
    ...queryOptions,
  });

export const useGetSipTrunkDetail = (sipTrunkId: number | null | undefined, { queryOptions }: QueryHookOptions<SipTrunkResponse> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.trunkDetail(sipTrunkId ?? undefined).queryKey,
    queryFn: () => sipTrunkApi.getTrunkDetail(sipTrunkId as number),
    enabled: !!sipTrunkId,
    ...queryOptions,
  });

/** 내선프로파일 옵션 — 노드 선택 시 TRUNK 타입 목록 로드 (SWAT cbCreate p4DnProfileId 정합, common-trunk 동일 패턴) */
export const useGetSipTrunkDnProfileOptions = (nodeId: number | null | undefined, { queryOptions }: QueryHookOptions<{ dnProfileId: number; dnProfileName: string }[]> = {}) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.dnProfileOptions(nodeId ?? undefined).queryKey,
    queryFn: () => sipTrunkApi.getDnProfileOptions(nodeId as number),
    enabled: nodeId != null,
    ...queryOptions,
  });

export const useCreateSipTrunk = ({ mutationOptions }: MutationHookOptions<SipTrunkResponse, SipTrunkCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => sipTrunkApi.createTrunk(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkNodes._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.memberList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSipTrunk = ({ mutationOptions }: MutationHookOptions<SipTrunkResponse, { sipTrunkId: number; body: SipTrunkUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sipTrunkId, body }) => sipTrunkApi.updateTrunk(sipTrunkId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkDetail._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.memberList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSipTrunks = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => sipTrunkApi.deleteTrunkBatch(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkNodes._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.memberList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.gdnList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 멤버 배정 ───────────────────────────────────────────────────────

export const useGetSipTrunkMembers = (
  params: { gdnId: number; nodeId: number; assignFilter?: 'all' | 'assigned' | 'unassigned'; tenantScope?: TenantScope } | null,
  { queryOptions }: QueryHookOptions<SipTrunkMemberResponse[]> = {},
) =>
  useQuery({
    queryKey: sipTrunkQueryKeys.memberList(params ?? undefined).queryKey,
    queryFn: () => sipTrunkApi.getMembers(params!),
    enabled: !!params && !!params.gdnId && !!params.nodeId,
    ...queryOptions,
  });

export const useSaveSipTrunkMembers = ({ mutationOptions }: MutationHookOptions<SipTrunkMemberSaveResult, SipTrunkMemberSaveRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => sipTrunkApi.saveMembers(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.memberList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.gdnList._def });
      qc.invalidateQueries({ queryKey: sipTrunkQueryKeys.trunkList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
