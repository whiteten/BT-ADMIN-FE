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
  AvailableSkillsetParams,
  AvailableSkillsetResponse,
  SkillAgentBulkAssignRequest,
  SkillAgentBulkAssignResult,
  SkillAgentResponse,
  SkillAgentUpdateRequest,
  SkillAssignTenantStat,
  SkillGroupCreateRequest,
  SkillGroupListParams,
  SkillGroupResponse,
  SkillGroupUpdateRequest,
} from '../types';

export const skillAssignQueryKeys = createQueryKeys('skill-assign', {
  tenantStats: null,
  availableSkillsets: (params?: Record<string, unknown>) => [params],
  skillsetsByAgent: (agentId?: number) => [agentId],
  skillGroups: (params?: Record<string, unknown>) => [params],
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
    queryFn: () => skillAssignApi.getSkillsetsByAgent(agentId as number),
    enabled: !!agentId,
    ...queryOptions,
  });

export const useGetSkillGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<SkillGroupResponse[]> = {}) =>
  useQuery({
    queryKey: skillAssignQueryKeys.skillGroups(params).queryKey,
    queryFn: () => skillAssignApi.getSkillGroups(params as SkillGroupListParams),
    ...queryOptions,
  });

// ─── Mutations — 상담사↔스킬셋 ──────────────────────────────────────────────

const invalidateAgentSkill = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.skillsetsByAgent._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.availableSkillsets._def });
  qc.invalidateQueries({ queryKey: skillAssignQueryKeys.tenantStats.queryKey });
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
