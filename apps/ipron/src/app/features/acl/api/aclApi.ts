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
 * - manager-node-list:  GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { Acl, AclCreateRequest, AclUpdateRequest } from '../types/acl.types';

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
    const response = await apiClient.get<DetailResponse<{ value: Acl[] }>>('/ipron-acl-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * ACL 상세 조회
   * @flow ipron-acl-detail
   * Backend: ApiResponse<AclResponse> -> BFF: data:{...}
   */
  getAclDetail: async (params: Record<string, unknown>): Promise<Acl> => {
    const response = await apiClient.get<DetailResponse<Acl>>('/ipron-acl-detail', { params });
    return extractDetail(response);
  },

  /**
   * ACL 등록
   * @flow ipron-acl-create
   */
  createAcl: async (data: AclCreateRequest): Promise<Acl> => {
    const response = await apiClient.post<DetailResponse<Acl>>('/ipron-acl-create', data);
    return extractDetail(response);
  },

  /**
   * ACL 수정
   * @flow ipron-acl-update
   */
  updateAcl: async ({ id, data }: { id: number; data: AclUpdateRequest }): Promise<Acl> => {
    const response = await apiClient.put<DetailResponse<Acl>>('/ipron-acl-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * ACL 삭제
   * @flow ipron-acl-delete
   */
  deleteAcl: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-acl-delete', { params });
  },

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<NodeSimpleResponse>>('/manager-node-list');
    return extractList(response);
  },

  // ─── CTI ACL ──────────────────────────────────────────────────────────────

  getCtiAcls: async (params?: Record<string, unknown>): Promise<Acl[]> => {
    const response = await apiClient.get<DetailResponse<{ value: Acl[] }>>('/ipron-cti-acl-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  createCtiAcl: async (data: AclCreateRequest): Promise<Acl> => {
    const response = await apiClient.post<DetailResponse<Acl>>('/ipron-cti-acl-create', data);
    return extractDetail(response);
  },

  updateCtiAcl: async ({ id, data }: { id: number; data: AclUpdateRequest }): Promise<Acl> => {
    const response = await apiClient.put<DetailResponse<Acl>>('/ipron-cti-acl-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  deleteCtiAcl: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-cti-acl-delete', { params });
  },
};
