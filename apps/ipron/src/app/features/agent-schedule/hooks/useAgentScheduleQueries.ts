/**
 * 상담사/상담그룹 스케줄 관리 React Query 훅.
 *
 * 캐시 축: kind(media|work|skill) × subject(agent|group).
 * - list      : kind + (tenantId/subject) params 로 캐시 분기
 * - assigned/assignable : kind + subject + scheduleId
 * - 쓰기(create/update/delete/assign/unassign) → list + tenants + assigned/assignable 무효화
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { agentScheduleApi } from '../api/agentScheduleApi';
import type { ScheduleAssignTarget, ScheduleInfoRequest, ScheduleInfoResponse, ScheduleKind, ScheduleSubject, ScheduleTenantStat } from '../types';

export const agentScheduleQueryKeys = createAppQueryKeys('agent-schedules', {
  getTenants: null,
  getList: (kind?: ScheduleKind, params?: Record<string, unknown>) => [kind, params],
  getAssigned: (kind?: ScheduleKind, scheduleId?: number, subject?: ScheduleSubject) => [kind, scheduleId, subject],
  getAssignable: (kind?: ScheduleKind, scheduleId?: number, subject?: ScheduleSubject) => [kind, scheduleId, subject],
});

// ─── Queries ───────────────────────────────────────────────────────────────

export const useGetScheduleTenants = ({ queryOptions }: QueryHookOptions<ScheduleTenantStat[]> = {}) =>
  useQuery({
    queryKey: agentScheduleQueryKeys.getTenants.queryKey,
    queryFn: () => agentScheduleApi.getTenants(),
    ...queryOptions,
  });

export const useGetSchedules = (
  kind: ScheduleKind,
  { params, queryOptions }: QueryHookWithParamsOptions<ScheduleInfoResponse[]> & { params?: { tenantId?: number; subject?: ScheduleSubject } } = {},
) =>
  useQuery({
    queryKey: agentScheduleQueryKeys.getList(kind, params).queryKey,
    queryFn: () => agentScheduleApi.getList(kind, params),
    ...queryOptions,
  });

export const useGetAssignedTargets = (
  kind: ScheduleKind,
  scheduleId: number | null | undefined,
  subject: ScheduleSubject,
  { queryOptions }: QueryHookOptions<ScheduleAssignTarget[]> = {},
) =>
  useQuery({
    queryKey: agentScheduleQueryKeys.getAssigned(kind, scheduleId ?? undefined, subject).queryKey,
    queryFn: () => agentScheduleApi.getAssigned(kind, scheduleId as number, subject),
    enabled: !!scheduleId,
    ...queryOptions,
  });

export const useGetAssignableTargets = (
  kind: ScheduleKind,
  scheduleId: number | null | undefined,
  subject: ScheduleSubject,
  { queryOptions }: QueryHookOptions<ScheduleAssignTarget[]> = {},
) =>
  useQuery({
    queryKey: agentScheduleQueryKeys.getAssignable(kind, scheduleId ?? undefined, subject).queryKey,
    queryFn: () => agentScheduleApi.getAssignable(kind, scheduleId as number, subject),
    enabled: !!scheduleId,
    ...queryOptions,
  });

// ─── Mutations — 스케줄 정의 CRUD ────────────────────────────────────────────

export const useCreateSchedule = (kind: ScheduleKind, { mutationOptions }: MutationHookOptions<ScheduleInfoResponse, ScheduleInfoRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleInfoRequest) => agentScheduleApi.create(kind, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSchedule = (kind: ScheduleKind, { mutationOptions }: MutationHookOptions<ScheduleInfoResponse, { id: number; body: ScheduleInfoRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ScheduleInfoRequest }) => agentScheduleApi.update(kind, id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getList._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSchedule = (kind: ScheduleKind, { mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => agentScheduleApi.remove(kind, id),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── Mutations — 배정/해제 ───────────────────────────────────────────────────

export const useAssignTargets = (
  kind: ScheduleKind,
  subject: ScheduleSubject,
  { mutationOptions }: MutationHookOptions<number, { scheduleId: number; targetIds: number[]; mediaType?: number }> = {},
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, targetIds, mediaType }: { scheduleId: number; targetIds: number[]; mediaType?: number }) =>
      agentScheduleApi.assign(kind, scheduleId, subject, targetIds, mediaType),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getAssigned._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getAssignable._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignTargets = (
  kind: ScheduleKind,
  subject: ScheduleSubject,
  { mutationOptions }: MutationHookOptions<number, { scheduleId: number; targetIds: number[] }> = {},
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, targetIds }: { scheduleId: number; targetIds: number[] }) => agentScheduleApi.unassign(kind, scheduleId, subject, targetIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getAssigned._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getAssignable._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: agentScheduleQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
