import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { datasourceApi } from '../api/datasourceApi';
import type { DataSourceItem, PrefixCandidate } from '../types/datasource.types';

export const datasourceQueryKeys = createQueryKeys('datasource', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getCandidates: (params?: Record<string, unknown>) => [params],
});

export const useGetDatasourceList = ({ params, queryOptions }: QueryHookWithParamsOptions<DataSourceItem[]> = {}) => {
  return useQuery({
    queryKey: datasourceQueryKeys.getList(params).queryKey,
    queryFn: () => datasourceApi.getList(params),
    ...queryOptions,
  });
};

export const useGetDatasourceDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DataSourceItem> = {}) => {
  return useQuery({
    queryKey: datasourceQueryKeys.getDetail(params).queryKey,
    queryFn: () => datasourceApi.getDetail(params),
    ...queryOptions,
  });
};

export const useGetPrefixCandidates = ({ params, queryOptions }: QueryHookWithParamsOptions<PrefixCandidate[]> = {}) => {
  return useQuery({
    queryKey: datasourceQueryKeys.getCandidates(params).queryKey,
    queryFn: () => datasourceApi.getCandidates(params),
    ...queryOptions,
  });
};

export const useCreateDatasource = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: datasourceApi.create,
    ...mutationOptions,
  });
};

export const useUpdateDatasource = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: datasourceApi.update,
    ...mutationOptions,
  });
};

export const useDeleteDatasource = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: datasourceApi.delete,
    ...mutationOptions,
  });
};

export const useLoadSchema = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: datasourceApi.loadSchema,
    ...mutationOptions,
  });
};
