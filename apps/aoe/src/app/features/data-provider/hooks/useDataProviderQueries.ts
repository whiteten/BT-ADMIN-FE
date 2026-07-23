import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { dbConnectionApi, dbToolApi } from '../api/dataProviderApi';
import type { DbConnection, DbConnectionCreateDatas, DbTool, DbToolCreateDatas } from '../types';

export const dataProviderQueryKeys = createAppQueryKeys('dataProvider', {
  getDbConnectionList: (params?: Record<string, unknown>) => [params],
  getDbConnectionDetail: (params: { connId: string }) => [params],
  getDbToolList: (params?: Record<string, unknown>) => [params],
  getDbToolDetail: (params: { toolId: string }) => [params],
});

/* ─────────────────────────── DB 접속정보 ─────────────────────────── */

export const useGetDbConnectionList = ({ params, queryOptions }: QueryHookWithParamsOptions<DbConnection[]> = {}) => {
  return useQuery({
    queryKey: dataProviderQueryKeys.getDbConnectionList(params).queryKey,
    queryFn: () => dbConnectionApi.getList(params as { page?: number; size?: number } | undefined),
    ...queryOptions,
  });
};

export const useCreateDbConnection = ({ mutationOptions }: MutationHookOptions<void, DbConnectionCreateDatas> = {}) => {
  return useMutation({
    mutationFn: dbConnectionApi.create,
    ...mutationOptions,
  });
};

export const useUpdateDbConnection = ({ mutationOptions }: MutationHookOptions<void, { params: { connId: string }; data: DbConnectionCreateDatas }> = {}) => {
  return useMutation({
    mutationFn: dbConnectionApi.update,
    ...mutationOptions,
  });
};

export const useDeleteDbConnection = ({ mutationOptions }: MutationHookOptions<void, { connId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => dbConnectionApi.delete(params),
    ...mutationOptions,
  });
};

/* ─────────────────────────── DB 질의도구 ─────────────────────────── */

export const useGetDbToolList = ({ params, queryOptions }: QueryHookWithParamsOptions<DbTool[]> = {}) => {
  return useQuery({
    queryKey: dataProviderQueryKeys.getDbToolList(params).queryKey,
    queryFn: () => dbToolApi.getList(params as { page?: number; size?: number } | undefined),
    ...queryOptions,
  });
};

export const useCreateDbTool = ({ mutationOptions }: MutationHookOptions<void, DbToolCreateDatas> = {}) => {
  return useMutation({
    mutationFn: dbToolApi.create,
    ...mutationOptions,
  });
};

export const useUpdateDbTool = ({ mutationOptions }: MutationHookOptions<void, { params: { toolId: string }; data: DbToolCreateDatas }> = {}) => {
  return useMutation({
    mutationFn: dbToolApi.update,
    ...mutationOptions,
  });
};

export const useDeleteDbTool = ({ mutationOptions }: MutationHookOptions<void, { toolId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => dbToolApi.delete(params),
    ...mutationOptions,
  });
};
