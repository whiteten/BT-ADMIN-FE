/**
 * 확장 어댑터 관리 React Query 훅 (IPR20S6042)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { adaptorApi } from '../api/adaptorApi';
import type { Adaptor, AdaptorConfig, AdaptorNode, AdaptorSystem, Watcher } from '../types/extAdaptor';

export const extAdaptorQueryKeys = createQueryKeys('extAdaptor', {
  getNodes: null,
  getForcusSystems: (params?: Record<string, unknown>) => [params],
  getAdaptors: (params?: Record<string, unknown>) => [params],
  getAdaptorConfigs: (params?: Record<string, unknown>) => [params],
  getWatchers: (params?: Record<string, unknown>) => [params],
});

export const useGetNodes = ({ queryOptions }: QueryHookOptions<AdaptorNode[]> = {}) =>
  useQuery({
    queryKey: extAdaptorQueryKeys.getNodes.queryKey,
    queryFn: () => adaptorApi.getNodes(),
    ...queryOptions,
  });

export const useGetForcusSystems = ({ params, queryOptions }: QueryHookWithParamsOptions<AdaptorSystem[]> = {}) =>
  useQuery({
    queryKey: extAdaptorQueryKeys.getForcusSystems(params).queryKey,
    queryFn: () => adaptorApi.getForcusSystems(params ?? {}),
    ...queryOptions,
  });

export const useGetAdaptors = ({ params, queryOptions }: QueryHookWithParamsOptions<Adaptor[]> = {}) =>
  useQuery({
    queryKey: extAdaptorQueryKeys.getAdaptors(params).queryKey,
    queryFn: () => adaptorApi.getAdaptors(params as { systemId: number }),
    ...queryOptions,
  });

export const useGetAdaptorConfigs = ({ params, queryOptions }: QueryHookWithParamsOptions<AdaptorConfig[]> = {}) =>
  useQuery({
    queryKey: extAdaptorQueryKeys.getAdaptorConfigs(params).queryKey,
    queryFn: () => adaptorApi.getAdaptorConfigs(params as { systemId: number; adaptorId: number }),
    ...queryOptions,
  });

export const useCreateAdaptor = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.createAdaptor,
    ...mutationOptions,
  });

export const useUpdateAdaptor = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.updateAdaptor,
    ...mutationOptions,
  });

export const useDeleteAdaptor = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.deleteAdaptor,
    ...mutationOptions,
  });

export const useBatchCopyAdaptors = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.batchCopyAdaptors,
    ...mutationOptions,
  });

export const useUploadAdaptorConfig = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.uploadAdaptorConfig,
    ...mutationOptions,
  });

export const useUpdateAdaptorConfig = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.updateAdaptorConfig,
    ...mutationOptions,
  });

export const useDeleteAdaptorConfig = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.deleteAdaptorConfig,
    ...mutationOptions,
  });

// ─── Watcher ───────────────────────────────────────────────────────────────
export const useGetWatchers = ({ params, queryOptions }: QueryHookWithParamsOptions<Watcher[]> = {}) =>
  useQuery({
    queryKey: extAdaptorQueryKeys.getWatchers(params).queryKey,
    queryFn: () => adaptorApi.getWatchers(params as { systemId: number }),
    ...queryOptions,
  });

export const useCreateWatcher = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.createWatcher,
    ...mutationOptions,
  });

export const useUpdateWatcher = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.updateWatcher,
    ...mutationOptions,
  });

export const useDeleteWatcher = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.deleteWatcher,
    ...mutationOptions,
  });

export const useRestartWatcher = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: adaptorApi.restartWatcher,
    ...mutationOptions,
  });
