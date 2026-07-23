/**
 * IPT 조직도관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - 조직 변경 (create/update/delete/sort) → tree + list + detail
 *  - 사용자 변경(ipt-user 쪽)이 트리 userCount 에 영향 → ipt-user 훅에서 tree invalidate
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { iptOrgApi } from '../api/iptOrgApi';
import type { IptOrgCreateRequest, IptOrgResponse, IptOrgSortSeqUpdateRequest, IptOrgTenantStat, IptOrgTreeNode, IptOrgUpdateRequest, MentOption } from '../types';

export const iptOrgQueryKeys = createAppQueryKeys('ipt-org', {
  getTree: (params?: Record<string, unknown>) => [params],
  getTenants: null,
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (dnGroupId?: number) => [dnGroupId],
  getMentOptions: (params?: Record<string, unknown>) => [params],
});

// ─── Queries ───────────────────────────────────────────────────────────────

export const useGetIptOrgTree = ({ params, queryOptions }: QueryHookWithParamsOptions<IptOrgTreeNode[]> = {}) => {
  return useQuery({
    queryKey: iptOrgQueryKeys.getTree(params).queryKey,
    queryFn: () => iptOrgApi.getTree(params),
    ...queryOptions,
  });
};

/** 테넌트별 조직 통계 — 운영자 대행 선택기 (활성 테넌트 전체, 빈 테넌트 포함) */
export const useGetIptOrgTenants = ({ queryOptions }: QueryHookOptions<IptOrgTenantStat[]> = {}) => {
  return useQuery({
    queryKey: iptOrgQueryKeys.getTenants.queryKey,
    queryFn: () => iptOrgApi.getTenants(),
    ...queryOptions,
  });
};

export const useGetIptOrgs = ({ params, queryOptions }: QueryHookWithParamsOptions<IptOrgResponse[]> = {}) => {
  return useQuery({
    queryKey: iptOrgQueryKeys.getList(params).queryKey,
    queryFn: () => iptOrgApi.getList(params as { tenantId: number; priorGrpId?: number; dnGrpName?: string }),
    enabled: !!params?.tenantId,
    ...queryOptions,
  });
};

export const useGetIptOrg = (dnGroupId: number | null | undefined, { queryOptions }: QueryHookOptions<IptOrgResponse> = {}) => {
  return useQuery({
    queryKey: iptOrgQueryKeys.getDetail(dnGroupId ?? undefined).queryKey,
    queryFn: () => iptOrgApi.getDetail(dnGroupId as number),
    enabled: !!dnGroupId,
    ...queryOptions,
  });
};

/** 멘트 콤보 — 마스터성 데이터, staleTime 5분 */
export const useGetIptMentOptions = ({ params, queryOptions }: QueryHookWithParamsOptions<MentOption[]> = {}) => {
  return useQuery({
    queryKey: iptOrgQueryKeys.getMentOptions(params).queryKey,
    queryFn: () => iptOrgApi.getMentOptions(params),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

// ─── Mutations ─────────────────────────────────────────────────────────────

const invalidateOrg = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: iptOrgQueryKeys.getTree._def });
  qc.invalidateQueries({ queryKey: iptOrgQueryKeys.getTenants.queryKey });
  qc.invalidateQueries({ queryKey: iptOrgQueryKeys.getList._def });
  qc.invalidateQueries({ queryKey: iptOrgQueryKeys.getDetail._def });
};

export const useCreateIptOrg = ({ mutationOptions }: MutationHookOptions<IptOrgResponse, IptOrgCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IptOrgCreateRequest) => iptOrgApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateOrg(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateIptOrg = ({ mutationOptions }: MutationHookOptions<IptOrgResponse, { dnGroupId: number; body: IptOrgUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dnGroupId, body }: { dnGroupId: number; body: IptOrgUpdateRequest }) => iptOrgApi.update(dnGroupId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateOrg(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteIptOrg = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dnGroupId: number) => iptOrgApi.delete(dnGroupId),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateOrg(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateIptOrgSortSeq = ({ mutationOptions }: MutationHookOptions<void, IptOrgSortSeqUpdateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IptOrgSortSeqUpdateRequest) => iptOrgApi.updateSortSeq(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateOrg(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
