/**
 * DNIS 관리 (MCS) API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-mcs-gdn-list:     GET    MCS 대표번호 목록 조회
 * - ipron-mcs-gdn-create:   POST   MCS 대표번호 등록
 * - ipron-mcs-gdn-update:   PUT    MCS 대표번호 수정
 * - ipron-mcs-gdn-delete:   DELETE MCS 대표번호 삭제 (cascade)
 * - ipron-mcs-dnis-list:    GET    MCS DNIS 목록 조회
 * - ipron-mcs-dnis-create:  POST   MCS DNIS 등록
 * - ipron-mcs-dnis-update:  PUT    MCS DNIS 수정
 * - ipron-mcs-dnis-delete:  DELETE MCS DNIS 삭제
 * - manager-node-list:      GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { McsdDnis, McsdDnisCreateRequest, McsdDnisUpdateRequest, McsdGdn, McsdGdnCreateRequest, McsdGdnUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mcsDnisApi = {
  // ─── GDN (대표번호) ──────────────────────────────────────────────────────

  /**
   * MCS 대표번호 목록 조회
   * @flow ipron-mcs-gdn-list
   * Backend: ApiResponse<PagedResponse<McsdGdnResponse>> -> BFF: data.items[]
   */
  getGdnList: async (params?: Record<string, unknown>): Promise<McsdGdn[]> => {
    const response = await apiClient.get<ListResponse<McsdGdn>>('/ipron-mcs-gdn-list', { params });
    return extractList(response);
  },

  /**
   * MCS 대표번호 등록
   * @flow ipron-mcs-gdn-create
   */
  createGdn: async (data: McsdGdnCreateRequest): Promise<McsdGdn> => {
    const response = await apiClient.post<DetailResponse<McsdGdn>>('/ipron-mcs-gdn-create', data);
    return extractDetail(response);
  },

  /**
   * MCS 대표번호 수정
   * @flow ipron-mcs-gdn-update
   */
  updateGdn: async ({ gdnNo, data }: { gdnNo: string; data: McsdGdnUpdateRequest }): Promise<McsdGdn> => {
    const response = await apiClient.put<DetailResponse<McsdGdn>>('/ipron-mcs-gdn-update', data, {
      params: { gdnNo },
    });
    return extractDetail(response);
  },

  /**
   * MCS 대표번호 삭제 (cascade: 하위 DNIS 전부 삭제)
   * @flow ipron-mcs-gdn-delete
   */
  deleteGdn: async ({ gdnNo }: { gdnNo: string }) => {
    return await apiClient.delete('/ipron-mcs-gdn-delete', { params: { gdnNo } });
  },

  // ─── DNIS (DNIS 상세) ────────────────────────────────────────────────────

  /**
   * MCS DNIS 목록 조회
   * @flow ipron-mcs-dnis-list
   * Backend: ApiResponse<List<McsdDnisResponse>> -> BFF: data.value[]
   */
  getDnisList: async (params: { gdnNo: string } & Record<string, unknown>): Promise<McsdDnis[]> => {
    const response = await apiClient.get<DetailResponse<{ value: McsdDnis[] }>>('/ipron-mcs-dnis-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * MCS DNIS 등록
   * @flow ipron-mcs-dnis-create
   */
  createDnis: async (data: McsdDnisCreateRequest): Promise<McsdDnis> => {
    const response = await apiClient.post<DetailResponse<McsdDnis>>('/ipron-mcs-dnis-create', data);
    return extractDetail(response);
  },

  /**
   * MCS DNIS 수정
   * @flow ipron-mcs-dnis-update
   */
  updateDnis: async ({ gdnNo, seq, nodeId, data }: { gdnNo: string; seq: number; nodeId: number; data: McsdDnisUpdateRequest }): Promise<McsdDnis> => {
    const response = await apiClient.put<DetailResponse<McsdDnis>>('/ipron-mcs-dnis-update', data, {
      params: { gdnNo, seq, nodeId },
    });
    return extractDetail(response);
  },

  /**
   * MCS DNIS 삭제
   * @flow ipron-mcs-dnis-delete
   */
  deleteDnis: async (params: { gdnNo: string; seq: number; nodeId: number }) => {
    return await apiClient.delete('/ipron-mcs-dnis-delete', { params });
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
};
