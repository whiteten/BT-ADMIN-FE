import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { taskboardApi } from '../api/taskboardApi';
import type { TaskboardBg, TaskboardLayout } from '../types/taskboard.types';

export const taskboardQueryKeys = createQueryKeys('taskboard-bg', {
  getBgList: (params?: Record<string, unknown>) => [params],
  getLayoutList: () => [{}],
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
