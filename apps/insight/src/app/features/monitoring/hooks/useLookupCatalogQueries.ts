import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { lookupCatalogApi } from '../api/lookupCatalogApi';
import type { LookupCatalogCreateDatas, LookupCatalogItem, SchemaPreview } from '../types';

export const monitoringLookupCatalogKeys = createAppQueryKeys('monitoring-lookup-catalogs', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (lookupCatalogId: number) => [lookupCatalogId],
  schemaPreview: (tableName: string) => [tableName],
});

export const useGetMonitoringLookupCatalogs = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<LookupCatalogItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...monitoringLookupCatalogKeys.list(params), queryFn: () => lookupCatalogApi.getLookupCatalogs(params), ...queryOptions });

export const useGetMonitoringLookupCatalog = ({
  params: { lookupCatalogId },
  queryOptions,
}: {
  params: { lookupCatalogId: number };
  queryOptions?: Omit<UseQueryOptions<LookupCatalogItem>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...monitoringLookupCatalogKeys.detail(lookupCatalogId),
    queryFn: () => lookupCatalogApi.getLookupCatalog(lookupCatalogId),
    ...queryOptions,
  });

export const useCreateMonitoringLookupCatalog = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<LookupCatalogItem, Error, LookupCatalogCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: LookupCatalogCreateDatas) => lookupCatalogApi.createLookupCatalog(data), ...mutationOptions });

export const useUpdateMonitoringLookupCatalog = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<LookupCatalogItem, Error, { lookupCatalogId: number; data: Partial<LookupCatalogCreateDatas> }> } = {}) =>
  useMutation({ mutationFn: ({ lookupCatalogId, data }) => lookupCatalogApi.updateLookupCatalog(lookupCatalogId, data), ...mutationOptions });

export const useDeleteMonitoringLookupCatalog = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (lookupCatalogId: number) => lookupCatalogApi.deleteLookupCatalog(lookupCatalogId), ...mutationOptions });

/** 등록/편집 Drawer Step 1 — 테이블명 입력 시점에 호출. mutation으로 처리 (다음 입력으로 재실행) */
export const useFetchLookupCatalogSchemaPreview = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<SchemaPreview, Error, string> } = {}) =>
  useMutation({ mutationFn: (tableName: string) => lookupCatalogApi.getSchemaPreview(tableName), ...mutationOptions });
