import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type DecryptBubblesArgs, type DecryptedBubbleDto, type DialogHistoryConfig, botDialogHistoryApi } from '../api/botDialogHistoryApi';
import type { BotServiceDto, IntentDto, NluAnalysisItem, RetrainLogItem, TrackingFlowItem } from '../types';

export const botDialogHistoryQueryKeys = createQueryKeys('history', {
  getConfig: null,
  getBotServices: (params?: Record<string, unknown>) => [params],
  getIntents: (params?: Record<string, unknown>) => [params],
  getBotDialogHistory: (params?: Record<string, unknown>) => [params],
  getBubbles: (params?: Record<string, unknown>) => [params],
  getNluAnalysis: (params?: Record<string, unknown>) => [params],
  getRetrainLogs: (params?: Record<string, unknown>) => [params],
});

/**
 * 대화이력 기능 설정 조회 훅 (mediaPlayerEnabled 등)
 */
export const useGetDialogHistoryConfig = () => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getConfig.queryKey,
    queryFn: () => botDialogHistoryApi.getConfig(),
    staleTime: 5 * 60 * 1000,
  });
};

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
 * 봇에 할당된 의도 목록 조회 훅
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

/**
 * 암호화 버블 복호화 훅 (on-demand + 감사 로그).
 * 캐시하지 않기 위해 React Query 캐시에 저장하지 않고 `mutate` 호출 결과만 사용합니다.
 */
export const useDecryptBubbles = ({ mutationOptions }: MutationHookOptions<DecryptedBubbleDto[], DecryptBubblesArgs> = {}) => {
  return useMutation({ mutationFn: botDialogHistoryApi.decryptBubbles, ...mutationOptions });
};

/**
 * 재학습 변경 이력 조회 훅
 */
export const useGetRetrainLogs = ({ params, queryOptions }: QueryHookWithParamsOptions<RetrainLogItem[]> = {}) => {
  return useQuery({
    queryKey: botDialogHistoryQueryKeys.getRetrainLogs(params).queryKey,
    queryFn: () => botDialogHistoryApi.getRetrainLogs(params as { ucidGkey: string; questionSeq: number; hop: number }),
    ...queryOptions,
  });
};
