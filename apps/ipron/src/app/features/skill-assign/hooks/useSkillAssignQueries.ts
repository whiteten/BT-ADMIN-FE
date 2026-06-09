/**
 * 스킬 배정 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - bulkAssign / unassign / update  → skillsetsByAgent + availableSkillsets + tenantStats
 *  - createGroup / updateGroup / deleteGroup → skillGroups + tenantStats
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { skillAssignApi } from '../api/skillAssignApi';
import type {
  AgentCoverageItem,
  AvailableSkillsetParams,
  AvailableSkillsetResponse,
  BulkGrantRequest,
  BulkGrantResult,
  BulkRevokeRequest,
  BulkRevokeResult,
  SkillAgentBulkAssignRequest,
  SkillAgentBulkAssignResult,
  SkillAgentResponse,
  SkillAgentUpdateRequest,
  SkillAssignTenantStat,
  SkillGroupCreateRequest,
  SkillGroupListParams,
  SkillGroupResponse,
  SkillGroupUpdateRequest,
  SkillsetCoverageItem,
} from '../types';

export const skillAssignQueryKeys = createQueryKeys('skill-assign', {
  tenantStats: null,
  availableSkillsets: (params?: Record<string, unknown>) => [params],
  skillsetsByAgent: (agentId?: number) => [agentId],
  agentsBySkillset: (skillsetId?: number) => [skillsetId],
  skillGroups: (params?: Record<string, unknown>) => [params],
  coverage: (agentIds?: number[]) => [agentIds],
  agentCoverage: (skillsetIds?: number[]) => [skillsetIds],
});

// ─── Queries ───────────────────────────────────────────────────────────────

export const useGetSkillAssignTenants = ({ queryOptions }: QueryHookOptions<SkillAssignTenantStat[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.tenantStats.queryKey,
    queryFn: () => skillAssignApi.getTenantStats(),
    ...queryOptions,
  });

export const useGetAvailableSkillsets = ({ params, queryOptions }: QueryHookWithParamsOptions<AvailableSkillsetResponse[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.availableSkillsets(params).queryKey,
    queryFn: () => skillAssignApi.getAvailableSkillsets(params as AvailableSkillsetParams),
    ...queryOptions,
  });

export const useGetSkillsetsByAgent = (agentId: number | null | undefined, { queryOptions }: QueryHookOptions<SkillAgentResponse[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.skillsetsByAgent(agentId ?? undefined).queryKey,
    // signal 전달 → react-query v5 자동취소(hover 폭주 시 직전 요청 abort)
    queryFn: ({ signal }) => skillAssignApi.getSkillsetsByAgent(agentId as number, signal),
    enabled: !!agentId,
    // hover 재진입 시 캐시 재사용 (SkillAssignStatusModal 과 동일)
    staleTime: 30_000,
    // observer 소멸 후에도 캐시 유지 → 재hover 시 staleTime 내 재요청 0
    gcTime: 60_000,
    ...queryOptions,
  });

/** 한 스킬셋에 배정된 상담사 목록 (배정 현황 조회 탭 — 스킬셋 기준) */
export const useGetAgentsBySkillset = (skillsetId: number | null | undefined, { queryOptions }: QueryHookOptions<SkillAgentResponse[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.agentsBySkillset(skillsetId ?? undefined).queryKey,
    // signal 전달 → react-query v5 자동취소
    queryFn: ({ signal }) => skillAssignApi.getAgentsBySkillset(skillsetId as number, signal),
    enabled: !!skillsetId,
    // hover 재진입 시 캐시 재사용 (SkillAssignStatusModal 과 동일)
    staleTime: 30_000,
    // observer 소멸 후에도 캐시 유지 → 재hover 시 staleTime 내 재요청 0
    gcTime: 60_000,
    ...queryOptions,
  });

export const useGetSkillGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<SkillGroupResponse[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.skillGroups(params).queryKey,
    queryFn: () => skillAssignApi.getSkillGroups(params as SkillGroupListParams),
    ...queryOptions,
  });

/** 선택된 상담사 N명 기준 스킬셋별 보유 인원 (모드 ① 우측 보유율) */
export const useGetSkillsetCoverage = (agentIds: number[], { queryOptions }: QueryHookOptions<SkillsetCoverageItem[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.coverage(agentIds).queryKey,
    queryFn: () => skillAssignApi.getSkillsetCoverage(agentIds),
    enabled: agentIds.length > 0,
    ...queryOptions,
  });

/** 선택된 스킬셋 M건 기준 상담사별 보유 수 (모드 ② 우측 보유율) */
export const useGetAgentCoverage = (skillsetIds: number[], { queryOptions }: QueryHookOptions<AgentCoverageItem[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.agentCoverage(skillsetIds).queryKey,
    queryFn: () => skillAssignApi.getAgentCoverage(skillsetIds),
    enabled: skillsetIds.length > 0,
    ...queryOptions,
  });

// ─── Mutations — 상담사↔스킬셋 ──────────────────────────────────────────────

const invalidateAgentSkill = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.skillsetsByAgent._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.agentsBySkillset._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.availableSkillsets._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.tenantStats.queryKey });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.coverage._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.agentCoverage._def });
};

export const useBulkAssignSkillsets = ({ mutationOptions }: MutationHookOptions<SkillAgentBulkAssignResult, { agentId: number; body: SkillAgentBulkAssignRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, body }) => skillAssignApi.bulkAssign(agentId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentSkill(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSkillAgent = ({ mutationOptions }: MutationHookOptions<SkillAgentResponse, { agentId: number; skillsetId: number; body: SkillAgentUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, skillsetId, body }) => skillAssignApi.updateSkillAgent(agentId, skillsetId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentSkill(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignSkillset = ({ mutationOptions }: MutationHookOptions<void, { agentId: number; skillsetId: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, skillsetId }) => skillAssignApi.unassign(agentId, skillsetId),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentSkill(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** N × M 일괄 부여 (모드 ① Drawer) */
export const useBulkGrant = ({ mutationOptions }: MutationHookOptions<BulkGrantResult, BulkGrantRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => skillAssignApi.bulkGrant(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentSkill(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** N × M 일괄 해제 (모드 ① Bulk Bar) */
export const useBulkRevoke = ({ mutationOptions }: MutationHookOptions<BulkRevokeResult, BulkRevokeRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => skillAssignApi.bulkRevoke(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentSkill(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── Mutations — 스킬모음 ──────────────────────────────────────────────────

const invalidateSkillGroups = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.skillGroups._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.tenantStats.queryKey });
};

export const useCreateSkillGroup = ({ mutationOptions }: MutationHookOptions<SkillGroupResponse, SkillGroupCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => skillAssignApi.createSkillGroup(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateSkillGroups(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSkillGroup = ({ mutationOptions }: MutationHookOptions<SkillGroupResponse, { skillGroupId: number; body: SkillGroupUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillGroupId, body }) => skillAssignApi.updateSkillGroup(skillGroupId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateSkillGroups(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSkillGroup = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skillGroupId) => skillAssignApi.deleteSkillGroup(skillGroupId),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateSkillGroups(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
