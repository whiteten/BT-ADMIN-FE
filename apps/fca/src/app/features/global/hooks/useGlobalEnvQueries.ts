import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { type MutationHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { globalEnvApi } from '../api/globalEnvApi';
import type { GlobalEnvDetailItem, GlobalEnvHistoryItem, GlobalEnvListItem } from '../types';

export const globalEnvQueryKeys = createAppQueryKeys('globalEnv', {
  getGlobalEnvList: (params?: Record<string, unknown>) => [params],
  getGlobalEnvDetail: (params?: Record<string, unknown>) => [params],
  getGlobalEnvHistoryList: (params?: Record<string, unknown>) => [params],
});

export const useGetGlobalEnvList = ({ params, queryOptions }: QueryHookWithParamsOptions<GlobalEnvListItem[]> = {}) => {
  return useQuery({
    queryKey: globalEnvQueryKeys.getGlobalEnvList(params).queryKey,
    queryFn: () => globalEnvApi.getGlobalEnvList(params),
    ...queryOptions,
  });
};

export const useGetGlobalEnvDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<GlobalEnvDetailItem> = {}) => {
  return useQuery({
    queryKey: globalEnvQueryKeys.getGlobalEnvDetail(params).queryKey,
    queryFn: () => globalEnvApi.getGlobalEnvDetail(params),
    ...queryOptions,
  });
};

export const useCreateGlobalEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: globalEnvApi.createGlobalEnv,
    ...mutationOptions,
  });
};

export const useUpdateGlobalEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: globalEnvApi.updateGlobalEnv,
    ...mutationOptions,
  });
};

export const useDeleteGlobalEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: globalEnvApi.deleteGlobalEnv,
    ...mutationOptions,
  });
};

export const useGetGlobalEnvHistoryList = ({ params, queryOptions }: QueryHookWithParamsOptions<GlobalEnvHistoryItem[]> = {}) => {
  return useQuery({
    queryKey: globalEnvQueryKeys.getGlobalEnvHistoryList(params).queryKey,
    queryFn: () => globalEnvApi.getGlobalEnvHistoryList(params),
    ...queryOptions,
  });
};

export const useReapplyGlobalEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: globalEnvApi.reapplyGlobalEnv,
    ...mutationOptions,
  });
};

export const useExportGlobalEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await globalEnvApi.exportGlobalEnv(params);
      const fileName = extractFileName(response.headers['content-disposition'], `GLOBAL_ENV_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useImportGlobalEnv = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: globalEnvApi.importGlobalEnv,
    ...mutationOptions,
  });
};
