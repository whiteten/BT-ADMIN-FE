import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { modelApi } from '../api/modelApi';
import type { AoeListItem } from '../types/aoe';
import type { EntityItem, EntityListItem, EntityValueListItem } from '../types/entity';
import type { IntentItem, IntentListItem, IntentSentenceListItem } from '../types/intent';
import type { ModelItem, ModelListItem } from '../types/model';

export const modelQueryKeys = createQueryKeys('models', {
  getModels: (params?: Record<string, unknown>) => [params],
  getModel: (params?: Record<string, unknown>) => [params],
  getIntents: (params?: Record<string, unknown>) => [params],
  getIntent: (params?: Record<string, unknown>) => [params],
  getIntentSentences: (params?: Record<string, unknown>) => [params],
  getEntities: (params?: Record<string, unknown>) => [params],
  getEntity: (params?: Record<string, unknown>) => [params],
  getEntityValues: (params?: Record<string, unknown>) => [params],
  getAoeAgents: (params?: Record<string, unknown>) => [params],
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

export const useGetIntentSentences = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentSentenceListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getIntentSentences(params).queryKey,
    queryFn: () => modelApi.getIntentSentences(params),
    ...queryOptions,
  });
};

export const useCreateIntentSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createIntentSentence,
    ...mutationOptions,
  });
};

export const useDeleteIntentSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteIntentSentence,
    ...mutationOptions,
  });
};

export const useGetEntities = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEntities(params).queryKey,
    queryFn: () => modelApi.getEntities(params),
    ...queryOptions,
  });
};

export const useGetEntity = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEntity(params).queryKey,
    queryFn: () => modelApi.getEntity(params),
    ...queryOptions,
  });
};

export const useCreateEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEntity,
    ...mutationOptions,
  });
};

export const useUpdateEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateEntity,
    ...mutationOptions,
  });
};

export const useDeleteEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEntity,
    ...mutationOptions,
  });
};

export const useGetEntityValues = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityValueListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEntityValues(params).queryKey,
    queryFn: () => modelApi.getEntityValues(params),
    ...queryOptions,
  });
};

export const useCreateEntityValue = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEntityValue,
    ...mutationOptions,
  });
};

export const useUpdateEntityValue = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateEntityValue,
    ...mutationOptions,
  });
};

export const useDeleteEntityValue = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEntityValue,
    ...mutationOptions,
  });
};

export const useGetAoeAgents = ({ params, queryOptions }: QueryHookWithParamsOptions<AoeListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getAoeAgents(params).queryKey,
    queryFn: () => modelApi.getAoeAgents(params),
    ...queryOptions,
  });
};

export const useGenerateSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.generateSentence,
    ...mutationOptions,
  });
};
