/**
 * 상담사 로그인번호 관리 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { agentAdnApi } from '../api/agentAdnApi';
import type {
  AdnAutoConfigResponse,
  AdnAutoConfigUpsertRequest,
  AgentAdnRowResponse,
  AgentAdnTenantStat,
  AutoAssignRequest,
  AutoAssignResponse,
  ConflictCheckResponse,
  UnassignRequest,
} from '../types';

export const agentAdnQueryKeys = createQueryKeys('agent-adns', {
  getList: (params?: Record<string, unknown>) => [params],
  getTenants: null,
  getPolicy: null,
  conflictCheck: (params?: Record<string, unknown>) => [params],
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetAgentAdns = ({ params, queryOptions }: QueryHookWithParamsOptions<AgentAdnRowResponse[]> = {}) => {
  return useQuery({
    queryKey: agentAdnQueryKeys.getList(params).queryKey,
    queryFn: () => agentAdnApi.getList(params),
    ...queryOptions,
  });
};

export const useGetAgentAdnTenants = ({ queryOptions }: QueryHookOptions<AgentAdnTenantStat[]> = {}) => {
  return useQuery({
    queryKey: agentAdnQueryKeys.getTenants.queryKey,
    queryFn: () => agentAdnApi.getTenants(),
    ...queryOptions,
  });
};

export const useGetAdnAutoConfig = ({ queryOptions }: QueryHookOptions<AdnAutoConfigResponse> = {}) => {
  return useQuery({
    queryKey: agentAdnQueryKeys.getPolicy.queryKey,
    queryFn: () => agentAdnApi.getPolicy(),
    ...queryOptions,
  });
};

export const useConflictCheck = ({ params, queryOptions }: QueryHookWithParamsOptions<ConflictCheckResponse, { prefix: string; digitLength: number }> = {}) => {
  return useQuery({
    queryKey: agentAdnQueryKeys.conflictCheck(params).queryKey,
    queryFn: () => agentAdnApi.conflictCheck(params as { prefix: string; digitLength: number }),
    enabled: !!params?.prefix && !!params?.digitLength,
    ...queryOptions,
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useSaveAdnAutoConfig = ({ mutationOptions }: MutationHookOptions<AdnAutoConfigResponse, AdnAutoConfigUpsertRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdnAutoConfigUpsertRequest) => agentAdnApi.savePolicy(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentAdnQueryKeys.getPolicy.queryKey });
      qc.invalidateQueries({ queryKey: agentAdnQueryKeys.conflictCheck._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAutoAssign = ({ mutationOptions }: MutationHookOptions<AutoAssignResponse, AutoAssignRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AutoAssignRequest) => agentAdnApi.autoAssign(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentAdnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: agentAdnQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassign = ({ mutationOptions }: MutationHookOptions<number, UnassignRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UnassignRequest) => agentAdnApi.unassign(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentAdnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: agentAdnQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
