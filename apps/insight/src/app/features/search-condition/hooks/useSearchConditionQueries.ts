import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { searchConditionApi } from '../api/searchConditionApi';
import type { SearchCondMeta, SearchConditionCreateDatas, SearchConditionDetail, SearchConditionListItem, SqlPreviewRequest, SqlPreviewResult } from '../types';

export const searchConditionKeys = createAppQueryKeys('statistics-search-conditions', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (searchCondId: number) => [searchCondId],
  stages: (searchCondId: number) => [searchCondId],
  resolve: (searchCondId: number, nodeCode: string | null, parentValue?: string | string[] | null, tenantId?: string | null) => [
    { searchCondId, nodeCode, parentValue: parentValue ?? null, tenantId: tenantId ?? null },
  ],
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

/** 장표 런타임 — 검색조건 단계 메타(stages) 조회. */
export const useGetSearchConditionStages = ({
  searchCondId,
  queryOptions,
}: {
  searchCondId: number;
  queryOptions?: Omit<UseQueryOptions<SearchCondMeta>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    queryKey: searchConditionKeys.stages(searchCondId).queryKey,
    queryFn: () => searchConditionApi.getStages(searchCondId),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });

/**
 * 장표 런타임 cascade — 한 단계의 옵션을 부모 선택값 기준으로 조회.
 * parentValue 가 바뀌면 자동 재조회. 루트 단계(nodeCode/parentValue 없음)도 동일 훅 사용.
 * tenantId(운영자 모드 조회 대상 테넌트)가 바뀌면 테넌트별 캐시가 분리돼 자동 재조회.
 */
export const useResolveStageOptions = ({
  searchCondId,
  nodeCode,
  parentValue,
  tenantId,
  queryOptions,
}: {
  searchCondId: number;
  nodeCode: string | null;
  parentValue?: string | string[] | null;
  tenantId?: string | null;
  queryOptions?: Omit<UseQueryOptions<SqlPreviewResult[]>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    queryKey: searchConditionKeys.resolve(searchCondId, nodeCode, parentValue, tenantId).queryKey,
    queryFn: () => searchConditionApi.resolveStageOptions(searchCondId, nodeCode, parentValue, tenantId),
    staleTime: 60 * 1000,
    ...queryOptions,
  });
