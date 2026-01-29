import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { botApi } from '../api/botApi';
import type {
  BotAoeDetailItem,
  BotDeployConfigItem,
  BotItem,
  BotListItem,
  BotVersionItem,
  BotVersionListItem,
  CheckDeployable,
  EnvListItem,
  EnvNodeItem,
  SttListItem,
  TtsListItem,
  WorkTimeListItem,
} from '../types';

export const botQueryKeys = createQueryKeys('bots', {
  getBots: (params?: Record<string, unknown>) => [params],
  getBot: (params?: Record<string, unknown>) => [params],
  getBotVersions: (params?: Record<string, unknown>) => [params],
  getBotVersion: (params?: Record<string, unknown>) => [params],
  getSttList: (params?: Record<string, unknown>) => [params],
  getTtsList: (params?: Record<string, unknown>) => [params],
  getWorkTimeList: (params?: Record<string, unknown>) => [params],
  getBotDeployConfig: (params?: Record<string, unknown>) => [params],
  getBotAoeDetail: (params?: Record<string, unknown>) => [params],
  getEnvList: (params?: Record<string, unknown>) => [params],
  getEnvNodeList: (params?: Record<string, unknown>) => [params],
  checkDeployable: (params?: Record<string, unknown>) => [params],
});

export const useGetBots = ({ params, queryOptions }: QueryHookWithParamsOptions<BotListItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getBots(params).queryKey,
    queryFn: () => botApi.getBots(params),
    ...queryOptions,
  });
};

export const useGetBot = ({ params, queryOptions }: QueryHookWithParamsOptions<BotItem> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getBot(params).queryKey,
    queryFn: () => botApi.getBot(params),
    ...queryOptions,
  });
};

export const useCreateBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.createBot,
    ...mutationOptions,
  });
};

export const useUpdateBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.updateBot,
    ...mutationOptions,
  });
};

export const useDeleteBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.deleteBot,
    ...mutationOptions,
  });
};

export const useUpdateBotVoice = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.updateBotVoice,
    ...mutationOptions,
  });
};

export const useUpdateBotSchedule = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.updateBotSchedule,
    ...mutationOptions,
  });
};

export const useGetBotVersions = ({ params, queryOptions }: QueryHookWithParamsOptions<BotVersionListItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getBotVersions(params).queryKey,
    queryFn: () => botApi.getBotVersions(params),
    ...queryOptions,
  });
};

export const useGetBotVersion = ({ params, queryOptions }: QueryHookWithParamsOptions<BotVersionItem> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getBotVersion(params).queryKey,
    queryFn: () => botApi.getBotVersion(params),
    ...queryOptions,
  });
};

export const useCreateBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.createBotVersion,
    ...mutationOptions,
  });
};

export const useUpdateBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.updateBotVersion,
    ...mutationOptions,
  });
};

export const useDeleteBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.deleteBotVersion,
    ...mutationOptions,
  });
};

export const usePublishBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.publishBotVersion,
    ...mutationOptions,
  });
};

export const useGetIfeInfo = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.getIfeInfo,
    ...mutationOptions,
  });
};

export const useGetSttList = ({ params, queryOptions }: QueryHookWithParamsOptions<SttListItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getSttList(params).queryKey,
    queryFn: () => botApi.getSttList(params),
    ...queryOptions,
  });
};

export const useGetTtsList = ({ params, queryOptions }: QueryHookWithParamsOptions<TtsListItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getTtsList(params).queryKey,
    queryFn: () => botApi.getTtsList(params),
    ...queryOptions,
  });
};

export const useGetWorkTimeList = ({ params, queryOptions }: QueryHookWithParamsOptions<WorkTimeListItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getWorkTimeList(params).queryKey,
    queryFn: () => botApi.getWorkTimeList(params),
    ...queryOptions,
  });
};

export const useGetBotDeployConfig = ({ params, queryOptions }: QueryHookWithParamsOptions<BotDeployConfigItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getBotDeployConfig(params).queryKey,
    queryFn: () => botApi.getBotDeployConfig(params),
    ...queryOptions,
  });
};

export const useCheckDeployable = ({ params, queryOptions }: QueryHookWithParamsOptions<CheckDeployable> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.checkDeployable(params).queryKey,
    queryFn: () => botApi.checkDeployable(params),
    ...queryOptions,
  });
};

export const useSaveBotDeployConfig = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.saveBotDeployConfig,
    ...mutationOptions,
  });
};

export const useGetBotAoeDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<BotAoeDetailItem> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getBotAoeDetail(params).queryKey,
    queryFn: () => botApi.getBotAoeDetail(params),
    ...queryOptions,
  });
};

export const useUpdateBotAoe = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.updateBotAoe,
    ...mutationOptions,
  });
};

export const useGetEnvList = ({ params, queryOptions }: QueryHookWithParamsOptions<EnvListItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getEnvList(params).queryKey,
    queryFn: () => botApi.getEnvList(params),
    ...queryOptions,
  });
};

export const useCreateEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.createEnv,
    ...mutationOptions,
  });
};

export const useUpdateEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.updateEnv,
    ...mutationOptions,
  });
};

export const useDeleteEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.deleteEnv,
    ...mutationOptions,
  });
};

export const useGetEnvNodeList = ({ params, queryOptions }: QueryHookWithParamsOptions<EnvNodeItem[]> = {}) => {
  return useQuery({
    queryKey: botQueryKeys.getEnvNodeList(params).queryKey,
    queryFn: () => botApi.getEnvNodeList(params),
    ...queryOptions,
  });
};

export const useApplyEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.applyEnv,
    ...mutationOptions,
  });
};
