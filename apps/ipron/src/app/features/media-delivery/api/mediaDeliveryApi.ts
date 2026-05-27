/**
 * 미디어전달관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-md-grp-list:      GET    미디어전달그룹 목록 조회
 * - ipron-md-grp-create:    POST   미디어전달그룹 등록
 * - ipron-md-grp-update:    PUT    미디어전달그룹 수정
 * - ipron-md-grp-delete:    DELETE 미디어전달그룹 삭제
 * - ipron-md-item-list:     GET    미디어전달 아이템 목록 조회
 * - ipron-md-item-detail:   GET    미디어전달 아이템 상세 조회
 * - ipron-md-item-create:   POST   미디어전달 아이템 등록
 * - ipron-md-item-update:   PUT    미디어전달 아이템 수정
 * - ipron-md-item-delete:   DELETE 미디어전달 아이템 삭제
 * - manager-node-list:      GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { MdGrp, MdGrpCreateRequest, MdGrpUpdateRequest, MdItem, MdItemCreateRequest, MdItemUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mediaDeliveryApi = {
  // ─── MD Group ──────────────────────────────────────────────────────────────

  /**
   * 미디어전달그룹 목록 조회
   * @flow ipron-md-grp-list
   * Backend: ApiResponse<List<MdGrpResponse>> -> BFF: data.value[]
   */
  getMdGrps: async (params?: Record<string, unknown>): Promise<MdGrp[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MdGrp[] }>>('/ipron-md-grp-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 미디어전달그룹 등록
   * @flow ipron-md-grp-create
   */
  createMdGrp: async (data: MdGrpCreateRequest): Promise<MdGrp> => {
    const response = await apiClient.post<ApiResponse<MdGrp>>('/ipron-md-grp-create', data);
    return response.data?.data;
  },

  /**
   * 미디어전달그룹 수정
   * @flow ipron-md-grp-update
   */
  updateMdGrp: async ({ id, data }: { id: number; data: MdGrpUpdateRequest }): Promise<MdGrp> => {
    const response = await apiClient.put<ApiResponse<MdGrp>>('/ipron-md-grp-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 미디어전달그룹 삭제
   * @flow ipron-md-grp-delete
   */
  deleteMdGrp: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-md-grp-delete', { params });
  },

  // ─── MD Item ───────────────────────────────────────────────────────────────

  /**
   * 미디어전달 아이템 목록 조회
   * @flow ipron-md-item-list
   * Backend: ApiResponse<List<MdItemResponse>> -> BFF: data.value[]
   */
  getMdItems: async (params?: Record<string, unknown>): Promise<MdItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MdItem[] }>>('/ipron-md-item-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 미디어전달 아이템 상세 조회
   * @flow ipron-md-item-detail
   * Backend: ApiResponse<MdItemResponse> -> BFF: data:{...}
   */
  getMdItemDetail: async (params: Record<string, unknown>): Promise<MdItem> => {
    const response = await apiClient.get<ApiResponse<MdItem>>('/ipron-md-item-detail', { params });
    return response.data?.data;
  },

  /**
   * 미디어전달 아이템 등록
   * @flow ipron-md-item-create
   */
  createMdItem: async (data: MdItemCreateRequest): Promise<MdItem> => {
    const response = await apiClient.post<ApiResponse<MdItem>>('/ipron-md-item-create', data);
    return response.data?.data;
  },

  /**
   * 미디어전달 아이템 수정
   * @flow ipron-md-item-update
   */
  updateMdItem: async ({ id, data }: { id: number; data: MdItemUpdateRequest }): Promise<MdItem> => {
    const response = await apiClient.put<ApiResponse<MdItem>>('/ipron-md-item-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 미디어전달 아이템 삭제
   * @flow ipron-md-item-delete
   */
  deleteMdItem: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-md-item-delete', { params });
  },

  // ─── Node (cross-service) ──────────────────────────────────────────────────

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },
};
