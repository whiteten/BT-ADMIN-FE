import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { searchConditionApi } from '../api/searchConditionApi';
import type { SearchConditionCreateDatas, SearchConditionDetail, SearchConditionListItem, SqlPreviewRequest, SqlPreviewResult } from '../types';

export const searchConditionKeys = createQueryKeys('statistics-search-conditions', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (searchCondId: number) => [searchCondId],
});

export const useGetSearchConditions = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<SearchConditionListItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...searchConditionKeys.list(params), queryFn: () => searchConditionApi.getSearchConditions(params), ...queryOptions });

export const useGetSearchCondition = ({
  params: { searchCondId },
  queryOptions,
}: {
  params: { searchCondId: number };
  queryOptions?: Omit<UseQueryOptions<SearchConditionDetail>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...searchConditionKeys.detail(searchCondId), queryFn: () => searchConditionApi.getSearchCondition(searchCondId), ...queryOptions });

export const useCreateSearchCondition = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<SearchConditionDetail, Error, SearchConditionCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: SearchConditionCreateDatas) => searchConditionApi.createSearchCondition(data), ...mutationOptions });

export const useUpdateSearchCondition = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<SearchConditionDetail, Error, { searchCondId: number; data: SearchConditionCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ searchCondId, data }) => searchConditionApi.updateSearchCondition(searchCondId, data), ...mutationOptions });

export const useDeleteSearchCondition = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (searchCondId: number) => searchConditionApi.deleteSearchCondition(searchCondId), ...mutationOptions });

export const usePreviewSql = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<SqlPreviewResult[], Error, SqlPreviewRequest> } = {}) =>
  useMutation({ mutationFn: (data: SqlPreviewRequest) => searchConditionApi.previewSql(data), ...mutationOptions });
