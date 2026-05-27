/**
 * 내선 프로파일 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-dn-profile-list:         GET    프로파일 목록 조회
 * - ipron-dn-profile-node-tenants: GET    노드-테넌트 매핑 조회
 * - ipron-dn-profile-detail:       GET    프로파일 상세 조회
 * - ipron-dn-profile-create:       POST   프로파일 등록
 * - ipron-dn-profile-update:       PUT    프로파일 수정
 * - ipron-dn-profile-delete:       DELETE 프로파일 삭제
 * - ipron-dn-profile-options:      GET    폼 드롭다운 옵션 일괄
 * - manager-tenant-list:           GET    테넌트 목록 조회 (cross-service)
 * - manager-node-list:             GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  DnProfile,
  DnProfileCreateRequest,
  DnProfileOptionsResponse,
  DnProfileResponse,
  DnProfileUpdateRequest,
  NodeSimpleResponse,
  NodeTenantItem,
  TenantSimpleResponse,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

function transformProfile(raw: DnProfileResponse): DnProfile {
  return { ...raw };
}

export const dnProfileApi = {
  /**
   * 프로파일 목록 조회
   * Backend: ApiResponse<List<DnProfileResponse>> -> BFF: data.value[] -> response.data?.data?.value
   * @flow ipron-dn-profile-list
   */
  getList: async (params?: Record<string, unknown>): Promise<DnProfile[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnProfileResponse[] }>>('/ipron-dn-profile-list', { params });
    const rawList = response.data?.data?.value ?? [];
    return rawList.map(transformProfile);
  },

  /**
   * 프로파일 상세 조회
   * @flow ipron-dn-profile-detail
   */
  getDetail: async (id: number): Promise<DnProfile> => {
    const response = await apiClient.get<ApiResponse<DnProfileResponse>>('/ipron-dn-profile-detail', {
      params: { id },
    });
    return transformProfile(response.data?.data);
  },

  /**
   * 프로파일 등록
   * @flow ipron-dn-profile-create
   */
  create: async (data: DnProfileCreateRequest): Promise<DnProfile> => {
    const response = await apiClient.post<ApiResponse<DnProfileResponse>>('/ipron-dn-profile-create', data);
    return transformProfile(response.data?.data);
  },

  /**
   * 프로파일 수정
   * @flow ipron-dn-profile-update
   */
  update: async ({ id, data }: { id: number; data: DnProfileUpdateRequest }): Promise<DnProfile> => {
    const response = await apiClient.put<ApiResponse<DnProfileResponse>>('/ipron-dn-profile-update', data, {
      params: { id },
    });
    return transformProfile(response.data?.data);
  },

  /**
   * 프로파일 삭제
   * @flow ipron-dn-profile-delete
   */
  delete: async (id: number) => {
    return await apiClient.delete('/ipron-dn-profile-delete', { params: { id } });
  },

  /**
   * 노드-테넌트 매핑 조회
   * @flow ipron-dn-profile-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NodeTenantItem[] }>>('/ipron-dn-profile-node-tenants');
    return response.data?.data?.value ?? [];
  },

  /**
   * 폼 드롭다운 옵션 일괄 조회 (노드/테넌트별 필터링)
   * Backend: ApiResponse<DnProfileOptionsResponse>
   * @flow ipron-dn-profile-options
   */
  getOptions: async (params: {
    nodeId: number;
    tenantId: number;
    drNodeId?: number | null;
    dnProfileType?: string | null;
    excludeProfileId?: number | null;
  }): Promise<DnProfileOptionsResponse> => {
    const response = await apiClient.get<ApiResponse<DnProfileOptionsResponse>>('/ipron-dn-profile-options', { params });
    return response.data?.data;
  },

  /**
   * 테넌트 목록 조회 (cross-service)
   * @flow manager-tenant-list
   */
  getTenants: async (): Promise<TenantSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TenantSimpleResponse[] }>>('/manager-tenant-list');
    return response.data?.data?.items ?? [];
  },

  /**
   * 노드 목록 조회 (cross-service)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },
};
