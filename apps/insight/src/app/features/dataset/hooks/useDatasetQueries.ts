import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { datasetApi } from '../api/datasetApi';
import type { DataSourceListItem, DatasetCreateRequest, DatasetDetail, DatasetListItem, DatasetUpdateRequest, FieldMetaItem, PrefixCandidate } from '../types';

export const datasetKeys = createQueryKeys('statistics-datasources', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (datasourceKey: string) => [datasourceKey],
  fields: (datasourceKey: string) => [datasourceKey],
  schemaPreview: (dbViewPrefix: string) => [dbViewPrefix],
  candidates: null,
  config: null,
});

export const useGetDataSources = ({
  params,
  queryOptions,
}: {
  params?: Record<string, unknown>;
  queryOptions?: Omit<UseQueryOptions<DataSourceListItem[]>, 'queryKey' | 'queryFn'>;
} = {}) =>
  useQuery({
    ...datasetKeys.list(params),
    queryFn: () => datasetApi.getDataSources(params),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });

export const useGetDatasets = ({
  params,
  queryOptions,
}: {
  params?: Record<string, unknown>;
  queryOptions?: Omit<UseQueryOptions<DatasetListItem[]>, 'queryKey' | 'queryFn'>;
} = {}) =>
  useQuery({
    ...datasetKeys.list(params),
    queryFn: () => datasetApi.getDatasets(params),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });

export const useGetDataSourceFields = ({
  params: { datasourceKey },
  queryOptions,
}: {
  params: { datasourceKey: string };
  queryOptions?: Omit<UseQueryOptions<FieldMetaItem[]>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...datasetKeys.fields(datasourceKey),
    queryFn: () => datasetApi.getDataSourceFields(datasourceKey),
    enabled: !!datasourceKey,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });

export const useGetSchemaPreview = ({
  params: { dbViewPrefix },
  queryOptions,
}: {
  params: { dbViewPrefix: string };
  queryOptions?: Omit<UseQueryOptions<FieldMetaItem[]>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...datasetKeys.schemaPreview(dbViewPrefix),
    queryFn: () => datasetApi.getSchemaPreview(dbViewPrefix),
    enabled: !!dbViewPrefix,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });

export const useGetDatasetCandidates = ({
  queryOptions,
}: {
  queryOptions?: Omit<UseQueryOptions<PrefixCandidate[]>, 'queryKey' | 'queryFn'>;
} = {}) =>
  useQuery({
    ...datasetKeys.candidates,
    queryFn: () => datasetApi.getCandidates(),
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });

export const useGetStatConfig = ({
  queryOptions,
}: {
  queryOptions?: Omit<UseQueryOptions<Record<string, unknown>>, 'queryKey' | 'queryFn'>;
} = {}) =>
  useQuery({
    ...datasetKeys.config,
    queryFn: () => datasetApi.getStatConfig(),
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
  });

export const useCreateDataset = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<DatasetDetail, Error, DatasetCreateRequest> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DatasetCreateRequest) => datasetApi.createDataset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
      queryClient.invalidateQueries({ queryKey: datasetKeys.candidates.queryKey });
    },
    ...mutationOptions,
  });
};

export const useUpdateDataset = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<DatasetDetail, Error, { datasourceKey: string; data: DatasetUpdateRequest }> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ datasourceKey, data }) => datasetApi.updateDataset(datasourceKey, data),
    onSuccess: (_result, { datasourceKey }) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(datasourceKey).queryKey });
    },
    ...mutationOptions,
  });
};

export const useDeleteDataset = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, string> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasourceKey: string) => datasetApi.deleteDataset(datasourceKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
    },
    ...mutationOptions,
  });
};
