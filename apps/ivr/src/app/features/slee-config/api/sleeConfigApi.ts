/**
 * SLEE 환경변수 API 클라이언트
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow:
 * - ivr-slee-config-tenants:     GET  테넌트 목록
 * - ivr-slee-config-files:       GET  ConfigFile 목록
 * - ivr-slee-config-categories:  GET  카테고리 목록
 * - ivr-slee-config-properties:  GET  속성 목록
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SleeConfigCategory, SleeConfigFile, SleeConfigProperty, SleeConfigTenant } from '../types/sleeConfig.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const sleeConfigApi = {
  getTenants: async (): Promise<SleeConfigTenant[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigTenant[] }>>('/ivr-slee-config-tenants');
    return response.data?.data?.value ?? [];
  },

  getConfigFiles: async (params?: Record<string, unknown>): Promise<SleeConfigFile[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigFile[] }>>('/ivr-slee-config-files', { params });
    return response.data?.data?.value ?? [];
  },

  getCategories: async (params: Record<string, unknown>): Promise<SleeConfigCategory[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigCategory[] }>>('/ivr-slee-config-categories', { params });
    return response.data?.data?.value ?? [];
  },

  getProperties: async (params: Record<string, unknown>): Promise<SleeConfigProperty[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigProperty[] }>>('/ivr-slee-config-properties', { params });
    return response.data?.data?.value ?? [];
  },
};
