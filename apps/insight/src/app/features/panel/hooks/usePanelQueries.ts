import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { type QueryRequest, type QueryResult, panelApi } from '../api/panelApi';

export const usePanelData = ({ params, queryOptions }: { params: QueryRequest; queryOptions?: Omit<UseQueryOptions<QueryResult>, 'queryKey' | 'queryFn'> }) =>
  useQuery({
    queryKey: ['panel-data', params.reportId, params.panelId, params.period, params.searchValues, params.comparison],
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
