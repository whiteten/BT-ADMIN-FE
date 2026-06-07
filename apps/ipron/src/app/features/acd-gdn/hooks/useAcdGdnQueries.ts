/**
 * ACD 그룹DN React Query 훅.
 *
 * invalidate 매트릭스:
 *  - GDN 변경 (create/update/delete) → list + tenants
 *  - Members 저장 → members + list (memberCount 보강용)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { acdGdnApi } from '../api/acdGdnApi';
import type { GdnCreateRequest, GdnMemberPoolParams, GdnMemberResponse, GdnMemberSaveRequest, GdnOptionItem, GdnResponse, GdnTenantStat, GdnUpdateRequest } from '../types';

export const acdGdnQueryKeys = createQueryKeys('acd-gdn', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (id?: number) => [id],
  tenants: null,
  members: (id?: number) => [id],
  memberCandidates: (id?: number) => [id],
  membersPool: (id?: number, params?: Record<string, unknown>) => [id, params],
  mentOptions: (tenantId?: number, nodeId?: number) => [tenantId, nodeId],
  skillsetOptions: (tenantId?: number) => [tenantId],
  accessCodeProfileOptions: (nodeId?: number) => [nodeId],
});

// ─── Queries ────────────────────────────────────────────────────────

export const useGetAcdGdns = ({ params, queryOptions }: QueryHookWithParamsOptions<GdnResponse[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.list(params).queryKey,
    queryFn: () => acdGdnApi.getList(params),
    ...queryOptions,
  });

export const useGetAcdGdnDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<GdnResponse> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.detail(id ?? undefined).queryKey,
    queryFn: () => acdGdnApi.getDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetAcdGdnTenants = ({ queryOptions }: QueryHookOptions<GdnTenantStat[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.tenants.queryKey,
    queryFn: () => acdGdnApi.getTenants(),
    ...queryOptions,
  });

export const useGetAcdGdnMembers = (id: number | null | undefined, { queryOptions }: QueryHookOptions<GdnMemberResponse[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.members(id ?? undefined).queryKey,
    queryFn: () => acdGdnApi.getMembers(id as number),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetAcdGdnMemberCandidates = (id: number | null | undefined, { queryOptions }: QueryHookOptions<GdnMemberResponse[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.memberCandidates(id ?? undefined).queryKey,
    queryFn: () => acdGdnApi.getMemberCandidates(id as number),
    enabled: !!id,
    ...queryOptions,
  });

/** 멤버 통합 풀 (기배정+미배정) — v2 우측 패널 단일 그리드 */
export const useGetAcdGdnMembersPool = (id: number | null | undefined, params?: GdnMemberPoolParams, { queryOptions }: QueryHookOptions<GdnMemberResponse[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.membersPool(id ?? undefined, params as Record<string, unknown> | undefined).queryKey,
    queryFn: () => acdGdnApi.getMembersPool(id as number, params),
    enabled: !!id,
    ...queryOptions,
  });

/** 멘트 8개 공용 콤보 옵션 (IMPL-BE §③, TB_IE_ANNOUNCEBGM) */
export const useGetAcdGdnMentOptions = (tenantId: number | null | undefined, nodeId: number | null | undefined, { queryOptions }: QueryHookOptions<GdnOptionItem[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.mentOptions(tenantId ?? undefined, nodeId ?? undefined).queryKey,
    queryFn: () => {
      const params: { tenantId?: number; nodeId?: number } = {};
      if (tenantId != null) params.tenantId = tenantId;
      if (nodeId != null) params.nodeId = nodeId;
      return acdGdnApi.getMentOptions(Object.keys(params).length ? params : undefined);
    },
    enabled: tenantId != null,
    ...queryOptions,
  });

/** 스킬셋 콤보 옵션 (ACD_TYPE=3 일 때 활성, IMPL-BE §③) */
export const useGetAcdGdnSkillsetOptions = (tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<GdnOptionItem[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.skillsetOptions(tenantId ?? undefined).queryKey,
    queryFn: () => acdGdnApi.getSkillsetOptions(tenantId != null ? { tenantId } : undefined),
    enabled: tenantId != null,
    ...queryOptions,
  });

/** 갭2: 접근코드 프로파일 콤보 옵션 (nodeId 기준, SWAT IPR20S3010.jsp:863-876 정합) */
export const useGetAcdGdnAccessCodeProfileOptions = (nodeId: number | null | undefined, { queryOptions }: QueryHookOptions<GdnOptionItem[]> = {}) =>
  useQuery({
    queryKey: acdGdnQueryKeys.accessCodeProfileOptions(nodeId ?? undefined).queryKey,
    queryFn: () => acdGdnApi.getAccessCodeProfileOptions(nodeId != null ? { nodeId } : undefined),
    enabled: true,
    ...queryOptions,
  });

// ─── Mutations ──────────────────────────────────────────────────────

export const useCreateAcdGdn = ({ mutationOptions }: MutationHookOptions<GdnResponse, GdnCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => acdGdnApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.list._def });
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.tenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateAcdGdn = ({ mutationOptions }: MutationHookOptions<GdnResponse, { id: number; body: GdnUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => acdGdnApi.update(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.list._def });
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.detail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteAcdGdns = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => acdGdnApi.deleteBatch(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.list._def });
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.tenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useSaveAcdGdnMembers = ({ mutationOptions }: MutationHookOptions<void, { id: number; body: GdnMemberSaveRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => acdGdnApi.saveMembers(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.members._def });
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.memberCandidates._def });
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.membersPool._def });
      qc.invalidateQueries({ queryKey: acdGdnQueryKeys.list._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
