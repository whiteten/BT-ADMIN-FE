/**
 * 수신번호 차단 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-call-screen-list:    GET    수신번호 차단 목록 조회
 * - ipron-call-screen-detail:  GET    수신번호 차단 상세 조회
 * - ipron-call-screen-create:  POST   수신번호 차단 등록
 * - ipron-call-screen-update:  PUT    수신번호 차단 수정
 * - ipron-call-screen-delete:  DELETE 수신번호 차단 삭제
 * - ipron-dod-trans-node-tenants: GET 노드-테넌트 매핑 (재사용)
 */
import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { CallScreen, CallScreenCreateRequest, CallScreenUpdateRequest } from '../types/callScreen.types';

export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const callScreenApi = {
  /**
   * 수신번호 차단 목록 조회
   * @flow ipron-call-screen-list
   * Backend: ApiResponse<List<CallScreenResponse>> -> BFF: data.value[]
   */
  getList: async (params?: Record<string, unknown>): Promise<CallScreen[]> => {
    const response = await apiClient.get<DetailResponse<{ value: CallScreen[] }>>('/ipron-call-screen-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * 수신번호 차단 상세 조회
   * @flow ipron-call-screen-detail
   */
  getDetail: async (params: Record<string, unknown>): Promise<CallScreen> => {
    const response = await apiClient.get<DetailResponse<CallScreen>>('/ipron-call-screen-detail', { params });
    return extractDetail(response);
  },

  /**
   * 수신번호 차단 등록
   * @flow ipron-call-screen-create
   */
  create: async (data: CallScreenCreateRequest): Promise<CallScreen> => {
    const response = await apiClient.post<DetailResponse<CallScreen>>('/ipron-call-screen-create', data);
    return extractDetail(response);
  },

  /**
   * 수신번호 차단 수정
   * @flow ipron-call-screen-update
   */
  update: async ({ id, data }: { id: number; data: CallScreenUpdateRequest }): Promise<CallScreen> => {
    const response = await apiClient.put<DetailResponse<CallScreen>>('/ipron-call-screen-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * 수신번호 차단 삭제
   * @flow ipron-call-screen-delete
   */
  delete: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-call-screen-delete', { params });
  },

  /**
   * 노드-테넌트 매핑 목록 (트리 구성용, DOD DNIS 재사용)
   * @flow ipron-dod-trans-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: NodeTenantItem[] }>>('/ipron-dod-trans-node-tenants');
    return extractDetail(response)?.value ?? [];
  },
};
