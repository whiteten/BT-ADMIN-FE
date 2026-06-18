/**
 * BSR 그룹 관리 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { bsrGroupApi } from '../api/bsrGroupApi';
import type {
  BsrGroupCreateRequest,
  BsrGroupResponse,
  BsrGroupTenantStat,
  BsrGroupUpdateRequest,
  BsrScheduleInfoCreateRequest,
  BsrScheduleInfoResponse,
  BsrScheduleInfoUpdateRequest,
} from '../types';

export const bsrGroupQueryKeys = createQueryKeys('bsr-groups', {
  getTenants: null,
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getGroupSchedules: (bsrGroupId?: number) => [bsrGroupId],
  getSchedulePool: (params?: Record<string, unknown>) => [params],
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetBsrGroupTenants = ({ queryOptions }: QueryHookOptions<BsrGroupTenantStat[]> = {}) =>
  useQuery({
    queryKey: bsrGroupQueryKeys.getTenants.queryKey,
    queryFn: () => bsrGroupApi.getTenants(),
    ...queryOptions,
  });

export const useGetBsrGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<BsrGroupResponse[]> = {}) =>
  useQuery({
    queryKey: bsrGroupQueryKeys.getList(params).queryKey,
    queryFn: () => bsrGroupApi.getList(params),
    ...queryOptions,
  });

export const useGetBsrGroupDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<BsrGroupResponse> = {}) =>
  useQuery({
    queryKey: bsrGroupQueryKeys.getDetail(id ?? undefined).queryKey,
    queryFn: () => bsrGroupApi.getDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetBsrGroupSchedules = (bsrGroupId: number | null | undefined, { queryOptions }: QueryHookOptions<BsrScheduleInfoResponse[]> = {}) =>
  useQuery({
    queryKey: bsrGroupQueryKeys.getGroupSchedules(bsrGroupId ?? undefined).queryKey,
    queryFn: () => bsrGroupApi.getGroupSchedules(bsrGroupId as number),
    enabled: !!bsrGroupId,
    ...queryOptions,
  });

export const useGetBsrSchedulePool = ({ params, queryOptions }: QueryHookWithParamsOptions<BsrScheduleInfoResponse[]> = {}) =>
  useQuery({
    queryKey: bsrGroupQueryKeys.getSchedulePool(params).queryKey,
    queryFn: () => bsrGroupApi.getSchedulePool(params?.tenantId as number, params?.bsrGroupId as number | undefined),
    enabled: !!params?.tenantId,
    ...queryOptions,
  });

// ─── Mutations ───────────────────────────────────────────────────────────────

export const useCreateBsrGroup = ({ mutationOptions }: MutationHookOptions<BsrGroupResponse, BsrGroupCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BsrGroupCreateRequest) => bsrGroupApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateBsrGroup = ({ mutationOptions }: MutationHookOptions<BsrGroupResponse, { id: number; body: BsrGroupUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => bsrGroupApi.update(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getDetail(args[1].id).queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteBsrGroup = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bsrGroupId: number) => bsrGroupApi.remove(bsrGroupId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/**
 * BSR 그룹 일괄 삭제 (벌크 1콜)
 */
export const useDeleteBsrGroupBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bsrGroupIds: number[]) => bsrGroupApi.removeBatch(bsrGroupIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAssignBsrSchedules = ({ mutationOptions }: MutationHookOptions<void, { bsrGroupId: number; scheduleIds: number[] }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bsrGroupId, scheduleIds }) => bsrGroupApi.assignSchedules(bsrGroupId, scheduleIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getGroupSchedules(args[1].bsrGroupId).queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignBsrSchedule = ({ mutationOptions }: MutationHookOptions<void, { bsrGroupId: number; scheduleId: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bsrGroupId, scheduleId }) => bsrGroupApi.unassignSchedule(bsrGroupId, scheduleId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getGroupSchedules(args[1].bsrGroupId).queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/**
 * 그룹에서 스케줄 일괄 배정 해제 (벌크 1콜)
 */
export const useUnassignBsrScheduleBatch = ({ mutationOptions }: MutationHookOptions<void, { bsrGroupId: number; scheduleIds: number[] }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bsrGroupId, scheduleIds }) => bsrGroupApi.unassignScheduleBatch(bsrGroupId, scheduleIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getGroupSchedules(args[1].bsrGroupId).queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useCreateBsrSchedule = ({ mutationOptions }: MutationHookOptions<BsrScheduleInfoResponse, BsrScheduleInfoCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BsrScheduleInfoCreateRequest) => bsrGroupApi.createSchedule(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getSchedulePool._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateBsrSchedule = ({ mutationOptions }: MutationHookOptions<BsrScheduleInfoResponse, { scheduleId: number; body: BsrScheduleInfoUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, body }) => bsrGroupApi.updateSchedule(scheduleId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getSchedulePool._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteBsrSchedule = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: number) => bsrGroupApi.deleteSchedule(scheduleId),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: bsrGroupQueryKeys.getSchedulePool._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
