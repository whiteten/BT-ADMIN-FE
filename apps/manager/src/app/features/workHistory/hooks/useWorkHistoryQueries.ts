import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { workHistoryApi } from '../api/workHistoryApi';
import type { WorkHistoryListParams } from '../types/workHistory.types';

/**
 * 작업이력 쿼리 키 팩토리
 */
export const workHistoryQueryKeys = createQueryKeys('workHistory', {
  list: (params: WorkHistoryListParams) => ['list', params],
  detail: (workId: string) => ['detail', workId],
});

/**
 * 작업이력 목록 조회 훅 (기간만 서버에서 필터링)
 */
export const useWorkHistoryList = (params: WorkHistoryListParams) => {
  return useQuery({
    queryKey: workHistoryQueryKeys.list(params).queryKey,
    queryFn: () => workHistoryApi.getList(params),
  });
};

/**
 * 작업이력 상세 조회 훅
 */
export const useWorkHistoryDetail = (workId: string | null) => {
  return useQuery({
    queryKey: workHistoryQueryKeys.detail(workId ?? '').queryKey,
    queryFn: () => {
      if (!workId) throw new Error('workId is required');
      return workHistoryApi.getDetail(workId);
    },
    enabled: !!workId,
  });
};
