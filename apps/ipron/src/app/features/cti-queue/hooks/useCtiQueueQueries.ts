/**
 * CTI 큐 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - create/update/delete → getList + getTenants (+ getDetail on update)
 *  - bsr/slt 스케줄 배정/해제 → 해당 큐 스케줄 목록
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { ctiQueueApi } from '../api/ctiQueueApi';
import type {
  AccessCodeProfileOption,
  CtiQueueBulkResult,
  CtiQueueBulkUpdateRequest,
  CtiQueueCreateRequest,
  CtiQueueGroupCreateRequest,
  CtiQueueGroupReorderRequest,
  CtiQueueGroupResponse,
  CtiQueueGroupUpdateRequest,
  CtiQueueMediaOption,
  CtiQueueMediaSkillBatchRequest,
  CtiQueueMediaSkillBatchResult,
  CtiQueueMemberReassignRequest,
  CtiQueueOptionItem,
  CtiQueueResponse,
  CtiQueueTenantStat,
  CtiQueueUpdateRequest,
  QuebsrScheduleResponse,
  ScheduleAssignRequest,
  SltScheduleResponse,
} from '../types';

export const ctiQueueQueryKeys = createQueryKeys('cti-queue', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (ctiqId?: number) => [ctiqId],
  getTenants: null,
  groupOptions: (tenantId?: number) => [tenantId],
  skillsetOptions: (tenantId?: number) => [tenantId],
  bsrGroupOptions: (tenantId?: number) => [tenantId],
  accessCodeProfileOptions: (tenantId?: number, nodeId?: number) => [tenantId, nodeId],
  mediaOptions: null,
  bsrSchedulePool: (tenantId?: number) => [tenantId],
  sltSchedulePool: (tenantId?: number) => [tenantId],
  bsrSchedules: (ctiqId?: number) => [ctiqId],
  sltSchedules: (ctiqId?: number) => [ctiqId],
  getGroups: (params?: Record<string, unknown>) => [params],
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetCtiQueues = ({ params, queryOptions }: QueryHookWithParamsOptions<CtiQueueResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getList(params).queryKey,
    queryFn: () => ctiQueueApi.getList(params),
    ...queryOptions,
  });

export const useGetCtiQueueDetail = (ctiqId: number | null | undefined, { queryOptions }: QueryHookOptions<CtiQueueResponse> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getDetail(ctiqId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getDetail(ctiqId as number),
    enabled: !!ctiqId,
    ...queryOptions,
  });

export const useGetCtiQueueTenants = ({ queryOptions }: QueryHookOptions<CtiQueueTenantStat[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getTenants.queryKey,
    queryFn: () => ctiQueueApi.getTenants(),
    ...queryOptions,
  });

export const useGetCtiQueueGroupOptions = (tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<CtiQueueOptionItem[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.groupOptions(tenantId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getGroupOptions(tenantId != null ? { tenantId } : undefined),
    enabled: tenantId != null,
    ...queryOptions,
  });

export const useGetCtiQueueSkillsetOptions = (tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<CtiQueueOptionItem[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.skillsetOptions(tenantId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getSkillsetOptions(tenantId != null ? { tenantId } : undefined),
    enabled: tenantId != null,
    ...queryOptions,
  });

export const useGetCtiQueueBsrGroupOptions = (tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<CtiQueueOptionItem[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.bsrGroupOptions(tenantId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getBsrGroupOptions(tenantId != null ? { tenantId } : undefined),
    enabled: tenantId != null,
    ...queryOptions,
  });

/**
 * 접근코드 프로파일 콤보 (노드/테넌트 단위) — access-profile-list flow 재사용.
 * 노드가 없으면(미선택) 조회 비활성. DR 콤보는 backUpNodeId 를 nodeId 로 넘겨 재사용.
 */
export const useGetCtiQueueAccessCodeProfileOptions = (
  tenantId: number | null | undefined,
  nodeId: number | null | undefined,
  { queryOptions }: QueryHookOptions<AccessCodeProfileOption[]> = {},
) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.accessCodeProfileOptions(tenantId ?? undefined, nodeId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getAccessCodeProfileOptions({ ...(tenantId != null ? { tenantId } : {}), ...(nodeId != null ? { nodeId } : {}) }),
    enabled: tenantId != null && nodeId != null && nodeId !== 0,
    ...queryOptions,
  });

export const useGetCtiQueueMediaOptions = ({ queryOptions }: QueryHookOptions<CtiQueueMediaOption[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.mediaOptions.queryKey,
    queryFn: () => ctiQueueApi.getMediaOptions(),
    ...queryOptions,
  });

/**
 * BSR 스케줄 풀 — 배정 후보 전체 목록 (피커 팝업용, SWAT IPR20S3020SIL.do 정합).
 * tenantId 가 있을 때만 조회. open 조건은 호출부가 enabled 로 제어.
 */
export const useGetCtiQueueBsrSchedulePool = (tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<QuebsrScheduleResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.bsrSchedulePool(tenantId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getBsrSchedulePool(tenantId != null ? { tenantId } : undefined),
    enabled: tenantId != null,
    ...queryOptions,
  });

/**
 * SLT 스케줄 풀 — 배정 후보 전체 목록 (피커 팝업용).
 */
export const useGetCtiQueueSltSchedulePool = (tenantId: number | null | undefined, { queryOptions }: QueryHookOptions<SltScheduleResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.sltSchedulePool(tenantId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getSltSchedulePool(tenantId != null ? { tenantId } : undefined),
    enabled: tenantId != null,
    ...queryOptions,
  });

export const useGetCtiQueueBsrSchedules = (ctiqId: number | null | undefined, { queryOptions }: QueryHookOptions<QuebsrScheduleResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.bsrSchedules(ctiqId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getBsrSchedules(ctiqId as number),
    enabled: !!ctiqId,
    ...queryOptions,
  });

export const useGetCtiQueueSltSchedules = (ctiqId: number | null | undefined, { queryOptions }: QueryHookOptions<SltScheduleResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.sltSchedules(ctiqId ?? undefined).queryKey,
    queryFn: () => ctiQueueApi.getSltSchedules(ctiqId as number),
    enabled: !!ctiqId,
    ...queryOptions,
  });

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateCtiQueue = ({ mutationOptions }: MutationHookOptions<CtiQueueResponse, CtiQueueCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiQueueApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCtiQueue = ({ mutationOptions }: MutationHookOptions<CtiQueueResponse, { ctiqId: number; body: CtiQueueUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ctiqId, body }) => ctiQueueApi.update(ctiqId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getDetail._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/**
 * 일괄 설정 (Bulk Update) — P1.
 * 성공/부분성공 후 목록 쿼리 invalidate.
 */
export const useBulkUpdateCtiQueues = ({ mutationOptions }: MutationHookOptions<CtiQueueBulkResult, CtiQueueBulkUpdateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiQueueApi.bulkUpdate(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/**
 * 미디어 스킬 매트릭스 일괄 저장 — "스킬 배정 보기" 토글.
 * 성공/부분성공(207) 후 목록 쿼리 invalidate.
 */
export const useMediaSkillsBatchCtiQueues = ({ mutationOptions }: MutationHookOptions<CtiQueueMediaSkillBatchResult, CtiQueueMediaSkillBatchRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiQueueApi.mediaSkillsBatch(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCtiQueue = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ctiqId) => ctiQueueApi.delete(ctiqId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAssignBsrSchedules = ({ mutationOptions }: MutationHookOptions<void, { ctiqId: number; body: ScheduleAssignRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ctiqId, body }) => ctiQueueApi.assignBsrSchedules(ctiqId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.bsrSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignBsrSchedule = ({ mutationOptions }: MutationHookOptions<void, { ctiqId: number; scheduleId: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ctiqId, scheduleId }) => ctiQueueApi.unassignBsrSchedule(ctiqId, scheduleId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.bsrSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAssignSltSchedules = ({ mutationOptions }: MutationHookOptions<void, { ctiqId: number; body: ScheduleAssignRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ctiqId, body }) => ctiQueueApi.assignSltSchedules(ctiqId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.sltSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignSltSchedule = ({ mutationOptions }: MutationHookOptions<void, { ctiqId: number; scheduleId: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ctiqId, scheduleId }) => ctiQueueApi.unassignSltSchedule(ctiqId, scheduleId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.sltSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 업무그룹 트리 (TB_TR_CTIQ_MASTER) ────────────────────────────────────────

export const useGetCtiQueueGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<CtiQueueGroupResponse[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.getGroups(params).queryKey,
    queryFn: () => ctiQueueApi.getGroups(params),
    ...queryOptions,
  });

export const useCreateCtiQueueGroup = ({ mutationOptions }: MutationHookOptions<CtiQueueGroupResponse, CtiQueueGroupCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiQueueApi.createGroup(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCtiQueueGroup = ({ mutationOptions }: MutationHookOptions<CtiQueueGroupResponse, { id: number; body: CtiQueueGroupUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => ctiQueueApi.updateGroup(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCtiQueueGroup = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => ctiQueueApi.removeGroup(id),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getGroups._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** 업무그룹 트리 D&D 재배치 — BFF flow: cti-queue-group-reorder */
export const useReorderCtiQueueGroup = ({ mutationOptions }: MutationHookOptions<CtiQueueGroupResponse, { treeId: number; body: CtiQueueGroupReorderRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treeId, body }) => ctiQueueApi.reorderGroup(treeId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 업무그룹 매핑 (TB_TR_CTIQ_MEMBER, 드래그앤드롭) ───────────────────────────

export const useReassignCtiQueueMembers = ({ mutationOptions }: MutationHookOptions<number, CtiQueueMemberReassignRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ctiQueueApi.reassignMembers(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignCtiQueueMembers = ({ mutationOptions }: MutationHookOptions<number, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ctiqIds) => ctiQueueApi.unassignMembers(ctiqIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: ctiQueueQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
