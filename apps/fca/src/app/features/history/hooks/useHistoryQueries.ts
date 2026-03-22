import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import type { TrackingFlowItem } from '../../tracking/types/tracking.types';
import { historyApi } from '../api/history.api';
import type { BotServiceDto, DialogHistoryListItem } from '../types/history.types';

export const historyQueryKeys = createQueryKeys('history', {
  getBotServices: (params?: Record<string, unknown>) => [params],
  getDialogHistory: (params?: Record<string, unknown>) => [params],
  getBubbles: (params?: Record<string, unknown>) => [params],
  getNluAnalysis: (params?: Record<string, unknown>) => [params],
});

/**
 * 봇 서비스 목록 조회 훅
 */
export const useGetBotServices = ({ params, queryOptions }: QueryHookWithParamsOptions<BotServiceDto[]> = {}) => {
  return useQuery({
    queryKey: historyQueryKeys.getBotServices(params).queryKey,
    queryFn: () => historyApi.getBotServices(params),
    ...queryOptions,
  });
};

/**
 * 대화 이력 목록 조회 훅
 */
export const useGetDialogHistory = ({ params, queryOptions }: QueryHookWithParamsOptions<any> = {}) => {
  return useQuery({
    queryKey: historyQueryKeys.getDialogHistory(params).queryKey,
    queryFn: () => historyApi.getDialogHistory(params),
    ...queryOptions,
  });
};

/**
 * 채팅 버블 목록 조회 훅
 */
export const useGetBubbles = ({ params, queryOptions }: QueryHookWithParamsOptions<TrackingFlowItem[]> = {}) => {
  return useQuery({
    queryKey: historyQueryKeys.getBubbles(params).queryKey,
    queryFn: () => historyApi.getBubbles(params),
    ...queryOptions,
  });
};

/**
 * NLU 분석 결과 조회 훅
 */
export const useGetNluAnalysis = ({ params, queryOptions }: QueryHookWithParamsOptions<any> = {}) => {
  return useQuery({
    queryKey: historyQueryKeys.getNluAnalysis(params).queryKey,
    queryFn: () => historyApi.getNluAnalysis(params),
    ...queryOptions,
  });
};
