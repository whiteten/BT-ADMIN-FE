import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { modelApi } from '../api/modelApi';
import type { AvailableModelItem, ModelCreateRequest, ModelDetailItem, ModelItem, ModelListItem, ModelUpdateRequest } from '../types';

export const modelQueryKeys = createAppQueryKeys('models', {
  getModels: (params?: Record<string, unknown>) => [params],
  getModel: (params?: Record<string, unknown>) => [params],
  getModelDetails: (params?: Record<string, unknown>) => [params],
});

export const useGetModels = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModels(params).queryKey,
    queryFn: () => modelApi.getModels(params),
    ...queryOptions,
  });
};

export const useValidateModel = ({ mutationOptions }: MutationHookOptions<AvailableModelItem[]> = {}) => {
  return useMutation({
    mutationFn: modelApi.validateModel,
    ...mutationOptions,
  });
};

export const useCreateModel = ({ mutationOptions }: MutationHookOptions<unknown, ModelCreateRequest> = {}) => {
  return useMutation({
    mutationFn: modelApi.createModel,
    ...mutationOptions,
  });
};

export const useGetModel = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModel(params).queryKey,
    queryFn: () => modelApi.getModel(params as { modelId: string }),
    enabled: !!params?.modelId,
    ...queryOptions,
  });
};

export const useDeleteModel = ({ mutationOptions }: MutationHookOptions<unknown, { modelId: string }> = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteModel,
    ...mutationOptions,
  });
};

export const useUpdateModel = ({ mutationOptions }: MutationHookOptions<unknown, { modelId: string } & ModelUpdateRequest> = {}) => {
  return useMutation({
    mutationFn: modelApi.updateModel,
    ...mutationOptions,
  });
};

export const useGetModelDetails = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelDetailItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModelDetails(params).queryKey,
    queryFn: () => modelApi.getModelDetails(params as { modelId: string }),
    enabled: !!params?.modelId,
    ...queryOptions,
  });
};

export const useUpdateModelDetail = ({
  mutationOptions,
}: MutationHookOptions<unknown, { detailId: string; data: { useYn: 0 | 1; costPerInputToken?: number; costPerOutputToken?: number } }> = {}) => {
  return useMutation({
    mutationFn: modelApi.updateModelDetail,
    ...mutationOptions,
  });
};
