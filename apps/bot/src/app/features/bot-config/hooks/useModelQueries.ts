import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { modelApi } from '../api/modelApi';
import type { IntentItem, IntentListItem } from '../types/intent';
import type { ModelItem, ModelListItem } from '../types/model';

export const modelQueryKeys = createQueryKeys('models', {
  getModels: (params?: Record<string, unknown>) => [params],
  getModel: (params?: Record<string, unknown>) => [params],
  getIntents: (params?: Record<string, unknown>) => [params],
  getIntent: (params?: Record<string, unknown>) => [params],
});

export const useGetModels = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModels(params).queryKey,
    queryFn: () => modelApi.getModels(params),
    ...queryOptions,
  });
};

export const useGetModel = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModel(params).queryKey,
    queryFn: () => modelApi.getModel(params),
    ...queryOptions,
  });
};

export const useCreateModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createModel,
    ...mutationOptions,
  });
};

export const useUpdateModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateModel,
    ...mutationOptions,
  });
};

export const useDeleteModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteModel,
    ...mutationOptions,
  });
};

export const useGetIntents = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getIntents(params).queryKey,
    queryFn: () => modelApi.getIntents(params),
    ...queryOptions,
  });
};

export const useGetIntent = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getIntent(params).queryKey,
    queryFn: () => modelApi.getIntent(params),
    ...queryOptions,
  });
};

export const useCreateIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createIntent,
    ...mutationOptions,
  });
};

export const useUpdateIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateIntent,
    ...mutationOptions,
  });
};

export const useDeleteIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteIntent,
    ...mutationOptions,
  });
};
