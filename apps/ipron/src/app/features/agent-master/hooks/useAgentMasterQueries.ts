/**
 * 상담사 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - 상담사 변경 (create/update/delete/move) → list + tenants + groupTree(agentCount)
 *  - 상담그룹 변경 (create/update/delete)    → groupTree + list (그룹명 표시)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { agentMasterApi } from '../api/agentMasterApi';
import type {
  AgentCreateRequest,
  AgentGroupCreateRequest,
  AgentGroupNode,
  AgentGroupReorderRequest,
  AgentGroupResponse,
  AgentGroupUpdateRequest,
  AgentMoveRequest,
  AgentResponse,
  AgentTenantStat,
  AgentUpdateRequest,
} from '../types';

export const agentMasterQueryKeys = createQueryKeys('agent-master', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getTenants: null,
  getGroupTree: (params?: Record<string, unknown>) => [params],
  getGroupDetail: (id?: number) => [id],
  getGroupChildrenCount: (id?: number) => [id],
});

// ─── Queries — 상담사 ──────────────────────────────────────────────────────

export const useGetAgents = ({ params, queryOptions }: QueryHookWithParamsOptions<AgentResponse[]> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getList(params).queryKey,
    queryFn: () => agentMasterApi.getList(params),
    ...queryOptions,
  });
};

export const useGetAgentDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<AgentResponse> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getDetail(id ?? undefined).queryKey,
    queryFn: () => agentMasterApi.getDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });
};

export const useGetAgentTenants = ({ queryOptions }: QueryHookOptions<AgentTenantStat[]> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getTenants.queryKey,
    queryFn: () => agentMasterApi.getTenants(),
    ...queryOptions,
  });
};

// ─── Queries — 상담그룹 ────────────────────────────────────────────────────

export const useGetAgentGroupTree = ({ params, queryOptions }: QueryHookWithParamsOptions<AgentGroupNode[]> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getGroupTree(params).queryKey,
    queryFn: () => agentMasterApi.getGroupTree(params),
    ...queryOptions,
  });
};

export const useGetAgentGroupDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<AgentGroupResponse> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getGroupDetail(id ?? undefined).queryKey,
    queryFn: () => agentMasterApi.getGroupDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });
};

// ─── Mutations — 상담사 ────────────────────────────────────────────────────

const invalidateAgentList = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getList._def });
  qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getTenants.queryKey });
  qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getGroupTree._def });
};

export const useCreateAgent = ({ mutationOptions }: MutationHookOptions<AgentResponse, AgentCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentCreateRequest) => agentMasterApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentList(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateAgent = ({ mutationOptions }: MutationHookOptions<AgentResponse, { id: number; body: AgentUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgentUpdateRequest }) => agentMasterApi.update(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentList(qc);
      qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteAgents = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => agentMasterApi.deleteBatch(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentList(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useMoveAgent = ({ mutationOptions }: MutationHookOptions<AgentResponse, { id: number; body: AgentMoveRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgentMoveRequest }) => agentMasterApi.move(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentList(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── Mutations — 상담그룹 ──────────────────────────────────────────────────

const invalidateGroupTree = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getGroupTree._def });
  qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getList._def });
};

export const useCreateAgentGroup = ({ mutationOptions }: MutationHookOptions<AgentGroupResponse, AgentGroupCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentGroupCreateRequest) => agentMasterApi.createGroup(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateGroupTree(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateAgentGroup = ({ mutationOptions }: MutationHookOptions<AgentGroupResponse, { id: number; body: AgentGroupUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgentGroupUpdateRequest }) => agentMasterApi.updateGroup(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateGroupTree(qc);
      qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getGroupDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteAgentGroup = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => agentMasterApi.deleteGroup(id),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateGroupTree(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useReorderAgentGroup = ({ mutationOptions }: MutationHookOptions<AgentGroupResponse, { id: number; body: AgentGroupReorderRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgentGroupReorderRequest }) => agentMasterApi.reorderGroup(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateGroupTree(qc);
      qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getGroupDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
