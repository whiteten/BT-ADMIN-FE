/**
 * OAuth2 클라이언트 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { clientApi } from '../api/clientApi';
import type { Client } from '../types/client.types';

export const clientQueryKeys = createQueryKeys('oauth-clients', {
  getClients: (params?: Record<string, unknown>) => [params],
  getClient: (params?: Record<string, unknown>) => [params],
});

/**
 * 클라이언트 목록 조회 훅
 */
export const useGetClients = ({ params, queryOptions }: QueryHookWithParamsOptions<Client[]> = {}) => {
  return useQuery({
    queryKey: clientQueryKeys.getClients(params).queryKey,
    queryFn: () => clientApi.getClients(params),
    ...queryOptions,
  });
};

/**
 * 클라이언트 단건 조회 훅
 */
export const useGetClient = ({ params, queryOptions }: QueryHookWithParamsOptions<Client> = {}) => {
  return useQuery({
    queryKey: clientQueryKeys.getClient(params).queryKey,
    queryFn: () => clientApi.getClient(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 클라이언트 생성 훅
 */
export const useCreateClient = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: clientApi.createClient,
    ...mutationOptions,
  });
};

/**
 * 클라이언트 수정 훅
 */
export const useUpdateClient = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: clientApi.updateClient,
    ...mutationOptions,
  });
};

/**
 * 클라이언트 삭제 훅
 */
export const useDeleteClient = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: clientApi.deleteClient,
    ...mutationOptions,
  });
};
