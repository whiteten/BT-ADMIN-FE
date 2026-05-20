/**
 * DOD DNIS 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-dod-trans-master-list:    GET    DOD DNIS 변환 마스터 목록 조회
 * - ipron-dod-trans-master-create:  POST   DOD DNIS 변환 마스터 등록
 * - ipron-dod-trans-master-update:  PUT    DOD DNIS 변환 마스터 수정
 * - ipron-dod-trans-master-delete:  DELETE DOD DNIS 변환 마스터 삭제
 * - ipron-dod-trans-item-list:      GET    DOD DNIS 변환 아이템 목록 조회
 * - ipron-dod-trans-item-create:    POST   DOD DNIS 변환 아이템 등록
 * - ipron-dod-trans-item-update:    PUT    DOD DNIS 변환 아이템 수정
 * - ipron-dod-trans-item-delete:    DELETE DOD DNIS 변환 아이템 삭제
 * - manager-node-list:              GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DodTransItem, DodTransItemCreateRequest, DodTransItemUpdateRequest, DodTransMaster, DodTransMasterCreateRequest, DodTransMasterUpdateRequest } from '../types';

export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
}

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dodTransApi = {
  // ─── Master ────────────────────────────────────────────────────────────────

  /**
   * DOD DNIS 변환 마스터 목록 조회
   * @flow ipron-dod-trans-master-list
   * Backend: ApiResponse<List<DodTransMasterResponse>> -> BFF: data.value[]
   */
  getMasterList: async (params?: Record<string, unknown>): Promise<DodTransMaster[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DodTransMaster[] }>>('/ipron-dod-trans-master-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * DOD DNIS 변환 마스터 등록
   * @flow ipron-dod-trans-master-create
   */
  createMaster: async (data: DodTransMasterCreateRequest): Promise<DodTransMaster> => {
    const response = await apiClient.post<DetailResponse<DodTransMaster>>('/ipron-dod-trans-master-create', data);
    return extractDetail(response);
  },

  /**
   * DOD DNIS 변환 마스터 수정
   * @flow ipron-dod-trans-master-update
   */
  updateMaster: async ({ id, data }: { id: number; data: DodTransMasterUpdateRequest }): Promise<DodTransMaster> => {
    const response = await apiClient.put<DetailResponse<DodTransMaster>>('/ipron-dod-trans-master-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * DOD DNIS 변환 마스터 삭제
   * @flow ipron-dod-trans-master-delete
   */
  deleteMaster: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-dod-trans-master-delete', { params });
  },

  // ─── Item ──────────────────────────────────────────────────────────────────

  /**
   * DOD DNIS 변환 아이템 목록 조회
   * @flow ipron-dod-trans-item-list
   * Backend: ApiResponse<List<DodTransItemResponse>> -> BFF: data.value[]
   */
  getItemList: async (params?: Record<string, unknown>): Promise<DodTransItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DodTransItem[] }>>('/ipron-dod-trans-item-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * DOD DNIS 변환 아이템 등록
   * @flow ipron-dod-trans-item-create
   */
  createItem: async (data: DodTransItemCreateRequest): Promise<DodTransItem> => {
    const response = await apiClient.post<DetailResponse<DodTransItem>>('/ipron-dod-trans-item-create', data);
    return extractDetail(response);
  },

  /**
   * DOD DNIS 변환 아이템 수정
   * @flow ipron-dod-trans-item-update
   */
  updateItem: async ({ dodTransId, listSeq, data }: { dodTransId: number; listSeq: number; data: DodTransItemUpdateRequest }): Promise<DodTransItem> => {
    const response = await apiClient.put<DetailResponse<DodTransItem>>('/ipron-dod-trans-item-update', data, {
      params: { dodTransId, listSeq },
    });
    return extractDetail(response);
  },

  /**
   * DOD DNIS 변환 아이템 삭제
   * @flow ipron-dod-trans-item-delete
   */
  deleteItem: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-dod-trans-item-delete', { params });
  },

  // ─── 공통 ─────────────────────────────────────────────────────────────────

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<NodeSimpleResponse>>('/manager-node-list');
    return extractList(response);
  },

  /**
   * 노드-테넌트 매핑 목록 (트리 구성용)
   * @flow ipron-dod-trans-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: NodeTenantItem[] }>>('/ipron-dod-trans-node-tenants');
    return extractDetail(response)?.value ?? [];
  },
};
