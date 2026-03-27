import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { botDialogHistoryApi } from '../api/botDialogHistoryApi';
import type { BotServiceDto, IntentDto } from '../types/botDialogHistory.types';
import type { NluAnalysisItem, TrackingFlowItem } from '../types/tracking.types';

export const botDialogHistoryQueryKeys = createQueryKeys('history', {
  getBotServices: (params?: Record<string, unknown>) => [params],
  getIntents: (params?: Record<string, unknown>) => [params],
  getBotDialogHistory: (params?: Record<string, unknown>) => [params],
  getBubbles: (params?: Record<string, unknown>) => [params],
  getNluAnalysis: (params?: Record<string, unknown>) => [params],
});

/**
 * 봇 서비스 목록 조회 훅
 */
export const useGetBotServices = ({ params, queryOptions }: QueryHookWithParamsOptions<BotServiceDto[]> = {}) => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getBotServices(params).queryKey,
    queryFn: () => botDialogHistoryApi.getBotServices(params),
    ...queryOptions,
  });
};

/**
 * 봇서비스에 할당된 의도 목록 조회 훅
 */
export const useGetIntents = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentDto[]> = {}) => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getIntents(params).queryKey,
    queryFn: () => botDialogHistoryApi.getIntents(params),
    ...queryOptions,
  });
};

/**
 * 대화 이력 목록 조회 훅
 */
export const useGetBotDialogHistory = ({ params, queryOptions }: QueryHookWithParamsOptions<any> = {}) => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getBotDialogHistory(params).queryKey,
    queryFn: () => botDialogHistoryApi.getBotDialogHistory(params),
    ...queryOptions,
  });
};

/**
 * 채팅 버블 목록 조회 훅 (NLU 분석 결과 포함)
 */
export const useGetBubbles = ({ params, queryOptions }: QueryHookWithParamsOptions<TrackingFlowItem[]> = {}) => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getBubbles(params).queryKey,
    queryFn: () => botDialogHistoryApi.getBubbles(params),
    ...queryOptions,
  });
};

/**
 * NLU 분석 결과 조회 훅 (경량 — 재학습 갱신용)
 */
export const useGetNluAnalysis = ({ params, queryOptions }: QueryHookWithParamsOptions<NluAnalysisItem[]> = {}) => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getNluAnalysis(params).queryKey,
    queryFn: () => botDialogHistoryApi.getNluAnalysis(params),
    ...queryOptions,
  });
};
