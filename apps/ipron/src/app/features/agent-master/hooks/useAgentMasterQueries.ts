/**
 * 상담사 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - 상담사 변경 (create/update/delete/move) → list + tenants + groupTree(agentCount)
 *  - 상담그룹 변경 (create/update/delete)    → groupTree + list (그룹명 표시)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { agentMasterApi } from '../api/agentMasterApi';
import type {
  AgentBulkMediaRequest,
  AgentConfig,
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
  BulkChangeResult,
  BulkGroupChangeRequest,
  Oscom,
} from '../types';

export const agentMasterQueryKeys = createAppQueryKeys('agent-master', {
  getConfig: null,
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getTenants: null,
  getOscoms: null,
  getGroupTree: (params?: Record<string, unknown>) => [params],
  getGroupDetail: (id?: number) => [id],
  getGroupChildrenCount: (id?: number) => [id],
});

// ─── Queries — 상담사 설정 ────────────────────────────────────────────────

/** 비밀번호 정책 설정. staleTime=Infinity — 서버 재시작 전까지 변경 없음. */
export const useGetAgentConfig = ({ queryOptions }: QueryHookOptions<AgentConfig> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getConfig.queryKey,
    queryFn: () => agentMasterApi.getConfig(),
    staleTime: Infinity,
    ...queryOptions,
  });
};

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

/** 아웃소싱업체(oscom) 마스터 콤보. 마스터성 데이터 — staleTime 5분으로 잦은 재조회 방지. */
export const useGetOscoms = ({ queryOptions }: QueryHookOptions<Oscom[]> = {}) => {
  return useQuery({
    queryKey: agentMasterQueryKeys.getOscoms.queryKey,
    queryFn: () => agentMasterApi.getOscoms(),
    staleTime: 5 * 60 * 1000,
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

/**
 * 상담사 다건 그룹 일괄 변경 (벌크 1콜). 그룹 트리 agentCount 변동도 invalidate.
 */
export const useBulkGroupAgents = ({ mutationOptions }: MutationHookOptions<BulkChangeResult, BulkGroupChangeRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkGroupChangeRequest) => agentMasterApi.bulkGroup(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentList(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/**
 * 상담사 다건 미디어 일괄 변경 (벌크 1콜).
 */
export const useBulkMediaAgents = ({ mutationOptions }: MutationHookOptions<void, AgentBulkMediaRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentBulkMediaRequest) => agentMasterApi.bulkMedia(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateAgentList(qc);
      qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getDetail._def });
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
