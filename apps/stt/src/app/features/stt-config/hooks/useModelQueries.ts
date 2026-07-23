import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { modelApi } from '../api/modelApi';
import type {
  RecogEvaluateRequestData,
  RecogResultListData,
  RecogResultSearchParams,
  SttModelCreateData,
  SttModelDeployCreateData,
  SttModelDeployItem,
  SttModelDeploySearchParams,
  SttModelItem,
  SttModelSearchParams,
  SttModelUpdateData,
} from '../types';

export const modelQueryKeys = createAppQueryKeys('model', {
  getSttModelList: (params?: Record<string, unknown>) => [params],
  getRecogResultList: (params?: Record<string, unknown>) => [params],
  getSttModelDeployList: (params?: Record<string, unknown>) => [params],
});

export const useGetSttModelList = ({
  params,
  queryOptions,
}: { params?: SttModelSearchParams | null; queryOptions?: Omit<UseQueryOptions<SttModelItem[]>, 'queryKey' | 'queryFn'> } = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getSttModelList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => modelApi.getSttModelList(params ?? undefined),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useCreateSttModel = ({ mutationOptions }: MutationHookOptions<unknown, SttModelCreateData> = {}) => {
  return useMutation({
    mutationFn: modelApi.createSttModel,
    ...mutationOptions,
  });
};

export const useUpdateSttModel = ({ mutationOptions }: MutationHookOptions<unknown, SttModelUpdateData> = {}) => {
  return useMutation({
    mutationFn: modelApi.updateSttModel,
    ...mutationOptions,
  });
};

export const useDeleteSttModel = ({ mutationOptions }: MutationHookOptions<unknown, string> = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteSttModel,
    ...mutationOptions,
  });
};

export const useGetRecogResultList = ({
  params,
  queryOptions,
}: {
  params?: RecogResultSearchParams | null;
  queryOptions?: Omit<UseQueryOptions<RecogResultListData>, 'queryKey' | 'queryFn'>;
} = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getRecogResultList((params as unknown as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => modelApi.getRecogResultList(params as RecogResultSearchParams),
    enabled: !!params?.modelVerId && !!params?.groupCode,
    ...queryOptions,
  });
};

export const useExecuteRecogEvaluate = ({ mutationOptions }: MutationHookOptions<unknown, RecogEvaluateRequestData> = {}) => {
  return useMutation({
    mutationFn: modelApi.executeRecogEvaluate,
    ...mutationOptions,
  });
};

export const useGetSttModelDeployList = ({ params, queryOptions }: { params?: SttModelDeploySearchParams; queryOptions?: UseQueryOptions<SttModelDeployItem[]> } = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getSttModelDeployList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => modelApi.getSttModelDeployList(params ?? undefined),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useDeployModel = ({ mutationOptions }: MutationHookOptions<unknown, SttModelDeployCreateData> = {}) => {
  return useMutation({
    mutationFn: modelApi.deployModel,
    ...mutationOptions,
  });
};
