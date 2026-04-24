import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { taskboardApi } from '../api/taskboardApi';
import type { TaskboardBg } from '../types/taskboard.types';

export const taskboardQueryKeys = createQueryKeys('taskboard-bg', {
  getBgList: (params?: Record<string, unknown>) => [params],
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

/**
 * [BG LAYOUT UPDATE] 전광판 레이아웃 저장 훅
 */
export const useUpdateTaskboardLayout = ({ mutationOptions }: MutationHookOptions<any, { bgId: number; layoutJson: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateTaskBoardLayout,
    ...mutationOptions,
  });
};
