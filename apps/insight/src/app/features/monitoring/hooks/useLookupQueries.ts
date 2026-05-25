import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { lookupApi } from '../api/lookupApi';
import type { LookupCatalogCreateDatas, LookupCatalogItem, SchemaPreview } from '../types';

export const lookupKeys = createQueryKeys('lookup', {
  catalog: (params?: Record<string, unknown>) => [params],
  catalogItem: (id: number) => [id],
  schemaPreview: (tableName: string) => [tableName],
});

export const useGetLookupCatalog = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<LookupCatalogItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...lookupKeys.catalog(params), queryFn: () => lookupApi.getCatalog(params), ...queryOptions });

export const useCreateLookupCatalogItem = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<LookupCatalogItem, Error, LookupCatalogCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: LookupCatalogCreateDatas) => lookupApi.createCatalogItem(data), ...mutationOptions });

export const useSchemaPreview = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<SchemaPreview, Error, string> } = {}) =>
  useMutation({ mutationFn: (tableName: string) => lookupApi.schemaPreview(tableName), ...mutationOptions });
