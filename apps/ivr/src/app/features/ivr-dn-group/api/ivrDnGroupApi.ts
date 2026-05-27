/**
 * IVR DN 그룹 API 클라이언트
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-dngroup-list:           GET    DN 그룹 목록 (nodeId 옵션)
 * - ivr-dngroup-system-usage:   GET    System DN 사용량 (nodeId)
 * - ivr-dngroup-detail:         GET    DN 그룹 상세
 * - ivr-dngroup-create:         POST   DN 그룹 등록
 * - ivr-dngroup-update:         PUT    DN 그룹 수정
 * - ivr-dngroup-delete:         DELETE DN 그룹 삭제
 * - ivr-subdngroup-list:        GET    Sub DN 그룹 목록 (dnGroupId)
 * - ivr-subdngroup-quota:       GET    Sub DN 채널 할당량 (dnGroupId, excludeSubId 옵션)
 * - ivr-subdngroup-create:      POST   Sub DN 그룹 등록 (dnGroupId)
 * - ivr-subdngroup-update:      PUT    Sub DN 그룹 수정
 * - ivr-subdngroup-delete:      DELETE Sub DN 그룹 삭제
 * - manager-node-list:          GET    노드 목록 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  IrDnGroup,
  IrDnGroupCreateRequest,
  IrDnGroupUpdateRequest,
  IrSubDnGroup,
  IrSubDnGroupCreateRequest,
  IrSubDnGroupUpdateRequest,
  IrSubDnQuota,
  IrSystemUsage,
} from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const ivrDnGroupApi = {
  // ─── DN Group (Master) ──────────────────────────────────────────────────

  getDnGroups: async (params?: Record<string, unknown>): Promise<IrDnGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ value: IrDnGroup[] }>>('/ivr-dngroup-list', { params });
    return response.data?.data?.value ?? [];
  },

  getSystemUsage: async (params: Record<string, unknown>): Promise<IrSystemUsage[]> => {
    const response = await apiClient.get<ApiResponse<{ value: IrSystemUsage[] }>>('/ivr-dngroup-system-usage', { params });
    return response.data?.data?.value ?? [];
  },

  getDnGroupDetail: async (params: Record<string, unknown>): Promise<IrDnGroup> => {
    const response = await apiClient.get<ApiResponse<IrDnGroup>>('/ivr-dngroup-detail', { params });
    return response.data?.data;
  },

  createDnGroup: async (data: IrDnGroupCreateRequest): Promise<IrDnGroup> => {
    const response = await apiClient.post<ApiResponse<IrDnGroup>>('/ivr-dngroup-create', data);
    return response.data?.data;
  },

  updateDnGroup: async ({ id, data }: { id: number; data: IrDnGroupUpdateRequest }): Promise<IrDnGroup> => {
    const response = await apiClient.put<ApiResponse<IrDnGroup>>('/ivr-dngroup-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteDnGroup: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-dngroup-delete', { params });
  },

  // ─── Sub DN Group ───────────────────────────────────────────────────────

  getSubDnGroups: async (params: Record<string, unknown>): Promise<IrSubDnGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ value: IrSubDnGroup[] }>>('/ivr-subdngroup-list', { params });
    return response.data?.data?.value ?? [];
  },

  getSubDnQuota: async (params: Record<string, unknown>): Promise<IrSubDnQuota> => {
    const response = await apiClient.get<ApiResponse<IrSubDnQuota>>('/ivr-subdngroup-quota', { params });
    return response.data?.data;
  },

  createSubDnGroup: async ({ id, data }: { id: number; data: IrSubDnGroupCreateRequest }): Promise<IrSubDnGroup> => {
    const response = await apiClient.post<ApiResponse<IrSubDnGroup>>('/ivr-subdngroup-create', data, {
      params: { id },
    });
    return response.data?.data;
  },

  updateSubDnGroup: async ({ subId, data }: { subId: number; data: IrSubDnGroupUpdateRequest }): Promise<IrSubDnGroup> => {
    const response = await apiClient.put<ApiResponse<IrSubDnGroup>>('/ivr-subdngroup-update', data, {
      params: { subId },
    });
    return response.data?.data;
  },

  deleteSubDnGroup: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-subdngroup-delete', { params });
  },

  // ─── Node (cross-service) ───────────────────────────────────────────────

  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },
};
