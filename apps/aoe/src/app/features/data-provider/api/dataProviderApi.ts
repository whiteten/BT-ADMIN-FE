import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DbConnection, DbConnectionCreateDatas, DbTool, DbToolCreateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/** DB 접속정보 API */
export const dbConnectionApi = {
  getList: async (params?: { page?: number; size?: number }) => {
    const response = await apiClient.get<ApiResponse<{ items: DbConnection[] }>>('/aoe-db-connection-list', { params });
    return response.data?.data?.items ?? [];
  },
  getDetail: async (params: { connId: string }) => {
    const response = await apiClient.get<ApiResponse<DbConnection>>('/aoe-db-connection-detail', { params });
    return response.data?.data;
  },
  create: async (data: DbConnectionCreateDatas) => {
    await apiClient.post('/aoe-db-connection-create', data);
  },
  update: async ({ params, data }: { params: { connId: string }; data: DbConnectionCreateDatas }) => {
    await apiClient.put('/aoe-db-connection-update', data, { params });
  },
  delete: async (params: { connId: string }) => {
    await apiClient.delete('/aoe-db-connection-delete', { params });
  },
};

/** DB 질의도구 API */
export const dbToolApi = {
  getList: async (params?: { page?: number; size?: number }) => {
    const response = await apiClient.get<ApiResponse<{ items: DbTool[] }>>('/aoe-db-tool-list', { params });
    return response.data?.data?.items ?? [];
  },
  getDetail: async (params: { toolId: string }) => {
    const response = await apiClient.get<ApiResponse<DbTool>>('/aoe-db-tool-detail', { params });
    return response.data?.data;
  },
  create: async (data: DbToolCreateDatas) => {
    await apiClient.post('/aoe-db-tool-create', data);
  },
  update: async ({ params, data }: { params: { toolId: string }; data: DbToolCreateDatas }) => {
    await apiClient.put('/aoe-db-tool-update', data, { params });
  },
  delete: async (params: { toolId: string }) => {
    await apiClient.delete('/aoe-db-tool-delete', { params });
  },
};
