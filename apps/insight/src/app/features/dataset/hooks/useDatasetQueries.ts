import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { datasetApi } from '../api/datasetApi';
import type { DataSourceListItem, DatasetCreateRequest, DatasetDetail, DatasetListItem, DatasetUpdateRequest, FieldMetaItem, PrefixCandidate } from '../types';

export const datasetKeys = createQueryKeys('statistics-datasources', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (datasetId: number) => [datasetId],
  fields: (datasetId: number) => [datasetId],
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

export const useGetDataset = ({
  params: { datasetId },
  queryOptions,
}: {
  params: { datasetId: number };
  queryOptions?: Omit<UseQueryOptions<DatasetDetail>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...datasetKeys.detail(datasetId),
    queryFn: () => datasetApi.getDataset(datasetId),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });

export const useGetDataSourceFields = ({
  params: { datasetId },
  queryOptions,
}: {
  params: { datasetId: number };
  queryOptions?: Omit<UseQueryOptions<FieldMetaItem[]>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...datasetKeys.fields(datasetId),
    queryFn: () => datasetApi.getDataSourceFields(datasetId),
    enabled: !!datasetId,
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
    ...mutationOptions,
    mutationFn: (data: DatasetCreateRequest) => datasetApi.createDataset(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
      queryClient.invalidateQueries({ queryKey: datasetKeys.candidates.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateDataset = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<DatasetDetail, Error, { datasetId: number; data: DatasetUpdateRequest }> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...mutationOptions,
    mutationFn: ({ datasetId, data }) => datasetApi.updateDataset(datasetId, data),
    onSuccess: (...args) => {
      const [, { datasetId }] = args;
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(datasetId).queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteDataset = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...mutationOptions,
    mutationFn: (datasetId: number) => datasetApi.deleteDataset(datasetId),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** 시스템 데이터셋 승격/해제 — 시스템 관리자 전용. */
export const useSetDatasetSystemFlag = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<DatasetDetail, Error, { datasetId: number; toSystem: boolean }> } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...mutationOptions,
    mutationFn: ({ datasetId, toSystem }) => datasetApi.setDatasetSystemFlag(datasetId, toSystem),
    onSuccess: (...args) => {
      const [, { datasetId }] = args;
      queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(datasetId).queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
