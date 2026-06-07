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
 * - ipron-dn-dod-limits: GET    발신제한/허용그룹 목록 (tenantId 필터, TB_IE_DOD_LIMIT)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { Cos, CosCreateRequest, CosUpdateRequest } from '../types';

export interface DodLimitOption {
  id: number;
  name: string;
}

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
    const response = await apiClient.get<ApiResponse<{ value: Cos[] }>>('/ipron-cos-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * COS 상세 조회
   * @flow ipron-cos-detail
   * Backend: ApiResponse<CosResponse> -> BFF: data:{...}
   */
  getDetail: async (cosId: number): Promise<Cos> => {
    const response = await apiClient.get<ApiResponse<Cos>>('/ipron-cos-detail', { params: { id: cosId } });
    return response.data?.data;
  },

  /**
   * COS 등록
   * @flow ipron-cos-create
   */
  create: async (data: CosCreateRequest): Promise<Cos> => {
    const response = await apiClient.post<ApiResponse<Cos>>('/ipron-cos-create', data);
    return response.data?.data;
  },

  /**
   * COS 수정
   * @flow ipron-cos-update
   */
  update: async ({ cosId, data }: { cosId: number; data: CosUpdateRequest }): Promise<Cos> => {
    const response = await apiClient.put<ApiResponse<Cos>>('/ipron-cos-update', data, {
      params: { id: cosId },
    });
    return response.data?.data;
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
    const response = await apiClient.get<ApiResponse<{ value: number }>>('/ipron-cos-ref-count', {
      params: { id: cosId },
    });
    return response.data?.data?.value ?? 0;
  },

  /**
   * 노드-테넌트 매핑 목록 (테넌트 탭 구성용, DOD DNIS 재사용)
   * @flow ipron-dod-trans-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NodeTenantItem[] }>>('/ipron-dod-trans-node-tenants');
    return response.data?.data?.value ?? [];
  },

  /**
   * 발신제한/허용그룹 목록 (테넌트별 TB_IE_DOD_LIMIT)
   * AS-IS: common.selDodLimitComboList → cbCreate('#poAddDodLimitSvc', 'dod_limit', 'tenantId='+tenantId)
   * BE: /api/ipron/dns/options?tenantId={tenantId} → DnOptionsResponse.dodLimits 필드
   * BFF flow: ipron-dn-dod-limits (단일 step, MAIN)
   * 응답 구조: ApiResponse<DnOptionsResponse> → data.dodLimits: [{id, name}]
   * @flow ipron-dn-dod-limits
   */
  getDodLimits: async (tenantId: number): Promise<DodLimitOption[]> => {
    const response = await apiClient.get<ApiResponse<{ dodLimits?: DodLimitOption[] }>>('/ipron-dn-dod-limits', {
      params: { tenantId },
    });
    return response.data?.data?.dodLimits ?? [];
  },
};
