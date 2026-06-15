/**
 * 교환기 IP 접근관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-acl-list:     GET    ACL 목록 조회
 * - ipron-acl-detail:   GET    ACL 상세 조회
 * - ipron-acl-create:   POST   ACL 등록
 * - ipron-acl-update:   PUT    ACL 수정
 * - ipron-acl-delete:   DELETE ACL 삭제
 * - ipron-pbx-acl-delete-batch: DELETE PBX ACL 일괄 삭제 (body: aclIds[])
 * - ipron-cti-acl-delete-batch: DELETE CTI ACL 일괄 삭제 (body: aclIds[])
 * - manager-node-list:  GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { Acl, AclCreateRequest, AclUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const aclApi = {
  /**
   * ACL 목록 조회
   * @flow ipron-acl-list
   * Backend: ApiResponse<List<AclResponse>> -> BFF: data.value[]
   */
  getAcls: async (params?: Record<string, unknown>): Promise<Acl[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Acl[] }>>('/ipron-acl-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * ACL 상세 조회
   * @flow ipron-acl-detail
   * Backend: ApiResponse<AclResponse> -> BFF: data:{...}
   */
  getAclDetail: async (params: Record<string, unknown>): Promise<Acl> => {
    const response = await apiClient.get<ApiResponse<Acl>>('/ipron-acl-detail', { params });
    return response.data?.data;
  },

  /**
   * ACL 등록
   * @flow ipron-acl-create
   */
  createAcl: async (data: AclCreateRequest): Promise<Acl> => {
    const response = await apiClient.post<ApiResponse<Acl>>('/ipron-acl-create', data);
    return response.data?.data;
  },

  /**
   * ACL 수정
   * @flow ipron-acl-update
   */
  updateAcl: async ({ id, data }: { id: number; data: AclUpdateRequest }): Promise<Acl> => {
    const response = await apiClient.put<ApiResponse<Acl>>('/ipron-acl-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * ACL 삭제
   * @flow ipron-acl-delete
   */
  deleteAcl: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-acl-delete', { params });
  },

  /**
   * PBX ACL 일괄 삭제
   * @flow ipron-pbx-acl-delete-batch (DELETE /api/ipron/pbx-acls/delete-batch, body: { aclIds })
   */
  deleteBatch: async (aclIds: number[]): Promise<void> => {
    await apiClient.delete('/ipron-pbx-acl-delete-batch', { data: { aclIds } });
  },

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },

  // ─── CTI ACL ──────────────────────────────────────────────────────────────

  getCtiAcls: async (params?: Record<string, unknown>): Promise<Acl[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Acl[] }>>('/ipron-cti-acl-list', { params });
    return response.data?.data?.value ?? [];
  },

  createCtiAcl: async (data: AclCreateRequest): Promise<Acl> => {
    const response = await apiClient.post<ApiResponse<Acl>>('/ipron-cti-acl-create', data);
    return response.data?.data;
  },

  updateCtiAcl: async ({ id, data }: { id: number; data: AclUpdateRequest }): Promise<Acl> => {
    const response = await apiClient.put<ApiResponse<Acl>>('/ipron-cti-acl-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteCtiAcl: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-cti-acl-delete', { params });
  },

  /**
   * CTI ACL 일괄 삭제
   * @flow ipron-cti-acl-delete-batch (DELETE /api/ipron/cti-acls/delete-batch, body: { aclIds })
   */
  deleteCtiBatch: async (aclIds: number[]): Promise<void> => {
    await apiClient.delete('/ipron-cti-acl-delete-batch', { data: { aclIds } });
  },
};
