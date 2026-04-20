/**
 * OAuth2 클라이언트 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { taskboardApi } from '../api/taskboardApi';
import type { TaskboardBg } from '../types/taskboard.types';

export const clientQueryKeys = createQueryKeys('oauth-clients', {
  getClients: (params?: Record<string, unknown>) => [params],
  getClient: (params?: Record<string, unknown>) => [params],
});

/**
 * 클라이언트 목록 조회 훅
 */
export const useGetTaskboardBg = ({ params, queryOptions }: QueryHookWithParamsOptions<TaskboardBg[]> = {}) => {
  console.log('params >> ', params);
  console.log('queryOptions >> ', queryOptions);
  return useQuery({
    queryKey: clientQueryKeys.getClients(params).queryKey, // 필요시 키 이름 변경(taskboard-bg 등)
    queryFn: () => taskboardApi.getTaskBoardBgs(params),
    ...queryOptions,
  });
};

/**
 * [BG INSERT] 전광판 배경 등록 훅 (FormData 지원)
 */
export const useCreateTaskboardBg = ({ mutationOptions }: MutationHookOptions<any, FormData> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createTaskBoardBg,
    ...mutationOptions,
  });
};
