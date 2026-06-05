/**
 * 스킬셋 관리 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { skillsetApi } from '../api/skillsetApi';
import type {
  ScheduleInfoRequest,
  ScheduleInfoResponse,
  SkillsetCreateRequest,
  SkillsetGroupCreateRequest,
  SkillsetGroupResponse,
  SkillsetGroupUpdateRequest,
  SkillsetMemberReassignRequest,
  SkillsetResponse,
  SkillsetTenantStat,
  SkillsetUpdateRequest,
} from '../types';

export const skillsetQueryKeys = createQueryKeys('skillsets', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getTenants: null,
  getGroups: (params?: Record<string, unknown>) => [params],
  getSchedules: (params?: Record<string, unknown>) => [params],
  getAssignedSchedules: (skillsetId?: number) => [skillsetId],
  getAssignableSchedules: (skillsetId?: number) => [skillsetId],
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetSkillsets = ({ params, queryOptions }: QueryHookWithParamsOptions<SkillsetResponse[]> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getList(params).queryKey,
    queryFn: () => skillsetApi.getList(params),
    ...queryOptions,
  });

export const useGetSkillsetDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<SkillsetResponse> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getDetail(id ?? undefined).queryKey,
    queryFn: () => skillsetApi.getDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetSkillsetTenants = ({ queryOptions }: QueryHookOptions<SkillsetTenantStat[]> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getTenants.queryKey,
    queryFn: () => skillsetApi.getTenants(),
    ...queryOptions,
  });

export const useGetSkillsetGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<SkillsetGroupResponse[]> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getGroups(params).queryKey,
    queryFn: () => skillsetApi.getGroups(params),
    ...queryOptions,
  });

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateSkillset = ({ mutationOptions }: MutationHookOptions<SkillsetResponse, SkillsetCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SkillsetCreateRequest) => skillsetApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSkillset = ({ mutationOptions }: MutationHookOptions<SkillsetResponse, { id: number; body: SkillsetUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SkillsetUpdateRequest }) => skillsetApi.update(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getDetail._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSkillsets = ({ mutationOptions }: MutationHookOptions<number, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => skillsetApi.deleteBatch(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 업무그룹 ───────────────────────────────────────────────────────────────

export const useCreateSkillsetGroup = ({ mutationOptions }: MutationHookOptions<SkillsetGroupResponse, SkillsetGroupCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SkillsetGroupCreateRequest) => skillsetApi.createGroup(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSkillsetGroup = ({ mutationOptions }: MutationHookOptions<SkillsetGroupResponse, { id: number; body: SkillsetGroupUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SkillsetGroupUpdateRequest }) => skillsetApi.updateGroup(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSkillsetGroup = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => skillsetApi.removeGroup(id),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 매핑 ──────────────────────────────────────────────────────────────────

export const useReassignSkillsetMembers = ({ mutationOptions }: MutationHookOptions<number, SkillsetMemberReassignRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SkillsetMemberReassignRequest) => skillsetApi.reassignMembers(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignSkillsetMembers = ({ mutationOptions }: MutationHookOptions<number, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => skillsetApi.unassignMembers(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 업무그룹 노드 이동 (up/down) ─────────────────────────────────────────────

export const useMoveSkillsetGroup = ({ mutationOptions }: MutationHookOptions<void, { treeId: number; up: boolean }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treeId, up }: { treeId: number; up: boolean }) => (up ? skillsetApi.moveGroupUp(treeId) : skillsetApi.moveGroupDown(treeId)),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getGroups._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ─── 스케쥴 관리 ──────────────────────────────────────────────────────────────

export const useGetSchedules = ({ params, queryOptions }: QueryHookWithParamsOptions<ScheduleInfoResponse[]> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getSchedules(params).queryKey,
    queryFn: () => skillsetApi.getSchedules(params),
    ...queryOptions,
  });

export const useGetAssignedSchedules = (skillsetId: number | null | undefined, { queryOptions }: QueryHookOptions<ScheduleInfoResponse[]> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getAssignedSchedules(skillsetId ?? undefined).queryKey,
    queryFn: () => skillsetApi.getAssignedSchedules(skillsetId as number),
    enabled: !!skillsetId,
    ...queryOptions,
  });

export const useGetAssignableSchedules = (skillsetId: number | null | undefined, { queryOptions }: QueryHookOptions<ScheduleInfoResponse[]> = {}) =>
  useQuery({
    queryKey: skillsetQueryKeys.getAssignableSchedules(skillsetId ?? undefined).queryKey,
    queryFn: () => skillsetApi.getAssignableSchedules(skillsetId as number),
    enabled: !!skillsetId,
    ...queryOptions,
  });

export const useCreateSchedule = ({ mutationOptions }: MutationHookOptions<ScheduleInfoResponse, ScheduleInfoRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleInfoRequest) => skillsetApi.createSchedule(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignableSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateSchedule = ({ mutationOptions }: MutationHookOptions<ScheduleInfoResponse, { id: number; body: ScheduleInfoRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ScheduleInfoRequest }) => skillsetApi.updateSchedule(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignedSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignableSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteSchedule = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => skillsetApi.removeSchedule(id),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignedSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignableSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAssignSchedules = ({ mutationOptions }: MutationHookOptions<number, { skillsetId: number; scheduleIds: number[] }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillsetId, scheduleIds }: { skillsetId: number; scheduleIds: number[] }) => skillsetApi.assignSchedules(skillsetId, scheduleIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignedSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignableSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignSchedule = ({ mutationOptions }: MutationHookOptions<number, { skillsetId: number; scheduleId: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillsetId, scheduleId }: { skillsetId: number; scheduleId: number }) => skillsetApi.unassignSchedule(skillsetId, scheduleId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignedSchedules._def });
      qc.invalidateQueries({ queryKey: skillsetQueryKeys.getAssignableSchedules._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
