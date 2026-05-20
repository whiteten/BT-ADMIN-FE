import { type UseMutationOptions, useMutation } from '@tanstack/react-query';
import { type QueryRequest, type QueryResult, panelApi } from '../api/panelApi';

export const useExecuteQuery = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<QueryResult, Error, QueryRequest>;
} = {}) =>
  useMutation({
    mutationFn: (request: QueryRequest) => panelApi.executeQuery(request),
    ...mutationOptions,
  });
