import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { type QueryRequest, type QueryResult, panelApi } from '../api/panelApi';

export const usePanelData = ({
  params,
  queryTrigger = 0,
  queryOptions,
}: {
  params: QueryRequest;
  queryTrigger?: number;
  queryOptions?: Omit<UseQueryOptions<QueryResult>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    queryKey: ['panel-data', params.reportId, params.panelId, params.period, params.searchValues, params.comparison, params.conditions, queryTrigger],
    queryFn: () => panelApi.executeQuery(params),
    staleTime: 0,
    ...queryOptions,
  });

export const useExecuteQuery = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<QueryResult, Error, QueryRequest>;
} = {}) =>
  useMutation({
    mutationFn: (request: QueryRequest) => panelApi.executeQuery(request),
    ...mutationOptions,
  });

export const useExportPanelExcel = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<void, Error, QueryRequest>;
} = {}) =>
  useMutation({
    mutationFn: (request: QueryRequest) => panelApi.exportExcel(request),
    ...mutationOptions,
  });
