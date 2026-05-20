import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { datasetApi } from '../api/datasetApi';
import type { DataSourceListItem, FieldMetaItem } from '../types';

export const datasetKeys = createQueryKeys('statistics-datasources', {
  list: (params?: Record<string, unknown>) => [params],
  fields: (datasourceKey: string) => [datasourceKey],
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
