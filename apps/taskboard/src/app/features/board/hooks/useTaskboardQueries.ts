import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type CtiAgentRow, type CtiGroupRow, type CtiQueueRow, ctiRedisApi } from '../api/ctiRedisApi';
import { taskboardApi } from '../api/taskboardApi';
import type { RollingGroup, TaskboardBg, TaskboardLayout } from '../types/taskboard.types';

export const taskboardQueryKeys = createQueryKeys('taskboard-bg', {
  getBgList: (params?: Record<string, unknown>) => [params],
  getLayoutList: () => [{}],
  getRollingGroupList: () => [{}],
  getPublicRollingGroup: (token: string) => [token],
});

/**
 * [BG LIST] 클라이언트 목록 조회 훅
 */
export const useGetTaskboardBg = ({ params, queryOptions }: QueryHookWithParamsOptions<TaskboardBg[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getBgList(params).queryKey,
    queryFn: () => taskboardApi.getTaskBoardBgs(params),
    ...queryOptions,
  });
};

/**
 * [BG INSERT] 전광판 배경 등록 훅 (FormData 지원)
 */
export const useCreateTaskboardBg = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createTaskBoardBg,
    ...mutationOptions,
  });
};

/**
 * [BG DELETE] 전광판 배경 삭제 훅
 */
export const useDeleteTaskboardBg = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteTaskBoardBg,
    ...mutationOptions,
  });
};

// ── 레이아웃 훅 ───────────────────────────────────────────────────────────

export const useGetTaskboardLayoutList = ({ queryOptions }: QueryHookWithParamsOptions<TaskboardLayout[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getLayoutList().queryKey,
    queryFn: () => taskboardApi.getLayoutList(),
    ...queryOptions,
  });
};

export const useCreateTaskboardLayout = ({
  mutationOptions,
}: MutationHookOptions<any, { pageId: number; tenantId: string; layoutName: string; layoutJson: string; authorName?: string; authRole?: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createLayout,
    ...mutationOptions,
  });
};

export const useUpdateLayout = ({ mutationOptions }: MutationHookOptions<any, { layoutId: number; layoutName: string; layoutJson: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateLayout,
    ...mutationOptions,
  });
};

export const useDeleteTaskboardLayout = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteLayout,
    ...mutationOptions,
  });
};

// ── 롤링 그룹 훅 ─────────────────────────────────────────────────────────

export const useGetRollingGroupList = ({ queryOptions }: QueryHookWithParamsOptions<RollingGroup[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getRollingGroupList().queryKey,
    queryFn: () => taskboardApi.getRollingGroupList(),
    ...queryOptions,
  });
};

export const useCreateRollingGroup = ({
  mutationOptions,
}: MutationHookOptions<any, { groupName: string; layoutIds: string; intervalSec: number; rollingData: string; tenantId?: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createRollingGroup,
    ...mutationOptions,
  });
};

export const useUpdateRollingGroup = ({
  mutationOptions,
}: MutationHookOptions<any, { groupId: number; groupName: string; layoutIds: string; intervalSec: number; rollingData: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateRollingGroup,
    ...mutationOptions,
  });
};

export const useDeleteRollingGroup = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteRollingGroup,
    ...mutationOptions,
  });
};

export const useGetPublicRollingGroup = (token: string, { queryOptions }: QueryHookWithParamsOptions<RollingGroup> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getPublicRollingGroup(token).queryKey,
    queryFn: () => taskboardApi.getPublicRollingGroup(token),
    enabled: !!token,
    ...queryOptions,
  });
};

// ── CTI Redis 실시간 데이터 훅 ────────────────────────────────────────────────

export const ctiRedisQueryKeys = createQueryKeys('cti-redis', {
  queueList: () => [{}],
  agentList: () => [{}],
  groupList: () => [{}],
});

/** 큐 리스트 (TB_IC_CTIQMASTER via Redis) — 5초 자동 갱신 */
export const useGetCtiQueueList = ({ queryOptions }: QueryHookWithParamsOptions<CtiQueueRow[]> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.queueList().queryKey,
    queryFn: () => ctiRedisApi.getCtiQueueList(),
    refetchInterval: 5000,
    ...queryOptions,
  });
};

/** 상담사 리스트 (TB_IC_AGENTMASTER via Redis) — 5초 자동 갱신 */
export const useGetCtiAgentList = ({ queryOptions }: QueryHookWithParamsOptions<CtiAgentRow[]> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.agentList().queryKey,
    queryFn: () => ctiRedisApi.getCtiAgentList(),
    refetchInterval: 5000,
    ...queryOptions,
  });
};

/** 상담그룹 리스트 (TB_IC_GROUPMASTER via Redis) — 5초 자동 갱신 */
export const useGetCtiGroupList = ({ queryOptions }: QueryHookWithParamsOptions<CtiGroupRow[]> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.groupList().queryKey,
    queryFn: () => ctiRedisApi.getCtiGroupList(),
    refetchInterval: 5000,
    ...queryOptions,
  });
};
