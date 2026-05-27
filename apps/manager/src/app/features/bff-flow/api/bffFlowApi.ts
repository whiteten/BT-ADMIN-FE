/**
 * BFF Flow 관리 API
 *
 * CRUD: BFF aggregation flow → MANAGER 서비스 경유
 * Refresh: BFF management 엔드포인트 직접 호출
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { BffFlow, FlowSpec } from '../types';

/** CRUD → aggregation flow → MANAGER */
const apiClient = new ApiClient({ serviceURL: '/bff' });

/** Refresh → BFF management 직접 호출 */
const managementClient = new ApiClient({ serviceURL: '/bff/management' });

export const bffFlowApi = {
  /** 전체 Flow 목록 조회 */
  getFlows: async (): Promise<BffFlow[]> => {
    const response = await apiClient.get<ApiResponse<{ items: BffFlow[] }>>('/bff-flow-list');
    return response.data?.data?.items ?? [];
  },

  /** Flow 상세 조회 */
  getFlow: async (flowId: string): Promise<BffFlow> => {
    const response = await apiClient.get<ApiResponse<BffFlow>>('/bff-flow-detail', {
      params: { flowId },
    });
    return response?.data?.data;
  },

  /** Flow 생성/수정 */
  saveFlow: async ({ flowId, spec }: { flowId: string; spec: FlowSpec }): Promise<BffFlow> => {
    const response = await apiClient.post<ApiResponse<BffFlow>>('/bff-flow-create', spec, {
      params: { flowId },
    });
    return response?.data?.data;
  },

  /** Flow 삭제 */
  deleteFlow: async (flowId: string): Promise<void> => {
    await apiClient.delete('/bff-flow-delete', {
      params: { flowId },
    });
  },

  /** 캐시 리프레시 (BFF 직접) */
  refresh: async (): Promise<void> => {
    await managementClient.post('/flows/refresh');
  },
};
