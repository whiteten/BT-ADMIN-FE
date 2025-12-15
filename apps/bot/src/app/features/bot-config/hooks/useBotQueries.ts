import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { botApi } from '../api/botApi';
import type { BotItem, BotListItem, BotVersionItem, BotVersionListItem, SttListItem, TtsListItem } from '../types';

export const botQueryKeys = createQueryKeys('bots', {
  getBots: (params?: Record<string, unknown>) => [params],
  getBot: (params?: Record<string, unknown>) => [params],
  getBotVersions: (params?: Record<string, unknown>) => [params],
  getBotVersion: (params?: Record<string, unknown>) => [params],
  getSttList: (params?: Record<string, unknown>) => [params],
  getTtsList: (params?: Record<string, unknown>) => [params],
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
