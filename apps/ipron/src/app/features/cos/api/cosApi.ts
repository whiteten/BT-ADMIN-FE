/**
 * COS 설정 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-cos-list:      GET    COS 목록 조회 (tenantId 필터)
 * - ipron-cos-detail:    GET    COS 상세 조회
 * - ipron-cos-create:    POST   COS 등록
 * - ipron-cos-update:    PUT    COS 수정
 * - ipron-cos-delete:    DELETE COS 삭제
 * - ipron-cos-ref-count: GET    참조 DN 수 조회
 * - ipron-dod-trans-node-tenants: GET 노드-테넌트 매핑 (재사용)
 */
import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { Cos, CosCreateRequest, CosUpdateRequest } from '../types/cos.types';

export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const cosApi = {
  /**
   * COS 목록 조회
   * @flow ipron-cos-list
   * Backend: ApiResponse<List<CosResponse>> -> BFF: data.value[]
   */
  getList: async (params?: Record<string, unknown>): Promise<Cos[]> => {
    const response = await apiClient.get<DetailResponse<{ value: Cos[] }>>('/ipron-cos-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * COS 상세 조회
   * @flow ipron-cos-detail
   * Backend: ApiResponse<CosResponse> -> BFF: data:{...}
   */
  getDetail: async (cosId: number): Promise<Cos> => {
    const response = await apiClient.get<DetailResponse<Cos>>('/ipron-cos-detail', { params: { id: cosId } });
    return extractDetail(response);
  },

  /**
   * COS 등록
   * @flow ipron-cos-create
   */
  create: async (data: CosCreateRequest): Promise<Cos> => {
    const response = await apiClient.post<DetailResponse<Cos>>('/ipron-cos-create', data);
    return extractDetail(response);
  },

  /**
   * COS 수정
   * @flow ipron-cos-update
   */
  update: async ({ cosId, data }: { cosId: number; data: CosUpdateRequest }): Promise<Cos> => {
    const response = await apiClient.put<DetailResponse<Cos>>('/ipron-cos-update', data, {
      params: { id: cosId },
    });
    return extractDetail(response);
  },

  /**
   * COS 삭제
   * @flow ipron-cos-delete
   */
  delete: async ({ cosId }: { cosId: number }) => {
    return await apiClient.delete('/ipron-cos-delete', { params: { id: cosId } });
  },

  /**
   * 참조 DN 수 조회
   * @flow ipron-cos-ref-count
   * Backend: ApiResponse<Long> -> BFF: data.value
   */
  getRefCount: async (cosId: number): Promise<number> => {
    const response = await apiClient.get<DetailResponse<{ value: number }>>('/ipron-cos-ref-count', {
      params: { id: cosId },
    });
    return extractDetail(response)?.value ?? 0;
  },

  /**
   * 노드-테넌트 매핑 목록 (테넌트 탭 구성용, DOD DNIS 재사용)
   * @flow ipron-dod-trans-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: NodeTenantItem[] }>>('/ipron-dod-trans-node-tenants');
    return extractDetail(response)?.value ?? [];
  },
};
