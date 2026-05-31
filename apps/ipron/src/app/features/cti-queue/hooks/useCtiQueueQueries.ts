/**
 * CTI 큐 관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - create/update/delete → getList + getTenants (+ getDetail on update)
 *  - bsr/slt 스케쥴 배정/해제 → 해당 큐 스케쥴 목록
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { ctiQueueApi } from '../api/ctiQueueApi';
import type {
  CtiQueueCreateRequest,
  CtiQueueMediaOption,
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
  mediaOptions: null,
  bsrSchedules: (ctiqId?: number) => [ctiqId],
  sltSchedules: (ctiqId?: number) => [ctiqId],
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

export const useGetCtiQueueMediaOptions = ({ queryOptions }: QueryHookOptions<CtiQueueMediaOption[]> = {}) =>
  useQuery({
    queryKey: ctiQueueQueryKeys.mediaOptions.queryKey,
    queryFn: () => ctiQueueApi.getMediaOptions(),
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
