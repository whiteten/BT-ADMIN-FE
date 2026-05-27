/**
 * 접근코드 프로파일 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-access-profile-list:     GET    프로파일 목록 조회
 * - ipron-access-profile-tree:     GET    프로파일 Tree 조회
 * - ipron-access-profile-detail:   GET    프로파일 상세 조회
 * - ipron-access-profile-create:   POST   프로파일 등록
 * - ipron-access-profile-update:   PUT    프로파일 수정
 * - ipron-access-profile-delete:   DELETE 프로파일 삭제
 * - ipron-access-profile-copy:     POST   프로파일 복사
 * - ipron-access-code-list:        GET    접근코드 목록 조회
 * - ipron-access-code-create:      POST   접근코드 등록
 * - ipron-access-code-update:      PUT    접근코드 수정
 * - ipron-access-code-delete:      DELETE 접근코드 삭제
 * - manager-tenant-list:           GET    테넌트 목록 조회 (cross-service)
 * - manager-node-list:             GET    노드 목록 조회 (cross-service)
 * - ipron-route-list:              GET    발신라우트 목록 조회 (노드별 필터)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AccessCode,
  AccessCodeResponse,
  AccessProfile,
  AccessProfileResponse,
  CodeCreateData,
  CodeUpdateData,
  NodeSimpleResponse,
  ProfileCopyData,
  ProfileCreateData,
  ProfileTreeNodeResponse,
  ProfileUpdateData,
  RouteSimpleResponse,
  TenantSimpleResponse,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

function transformProfile(raw: AccessProfileResponse): AccessProfile {
  return {
    accessCodeProfileId: raw.accessCodeProfileId,
    accessCodeProfileName: raw.accessCodeProfileName,
    tenantId: raw.tenantId,
    tenantName: raw.tenantName ?? '',
    nodeId: raw.nodeId,
    nodeName: raw.nodeName ?? '',
    codeCount: raw.codeCount ?? 0,
  };
}

function transformCode(raw: AccessCodeResponse): AccessCode {
  return {
    accessCodeProfileId: raw.accessCodeProfileId,
    accessCode: raw.accessCode,
    accessCodeName: raw.accessCodeName,
    minDigits: raw.minDigits,
    maxDigits: raw.maxDigits,
    routeId: raw.routeId,
    routeName: raw.routeName,
    accessCodeDesc: raw.accessCodeDesc,
  };
}

export const accessProfileApi = {
  /**
   * 프로파일 목록 조회
   * Backend: ApiResponse<List<AccessProfileResponse>> -> BFF: data.value[]
   * @flow ipron-access-profile-list
   */
  getProfiles: async (params?: Record<string, unknown>): Promise<AccessProfile[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AccessProfileResponse[] }>>('/ipron-access-profile-list', { params });
    const rawList = response.data?.data?.value ?? [];
    return rawList.map(transformProfile);
  },

  /**
   * 프로파일 트리 조회
   * @flow ipron-access-profile-tree
   */
  getProfileTree: async (): Promise<ProfileTreeNodeResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ProfileTreeNodeResponse[] }>>('/ipron-access-profile-tree');
    return response.data?.data?.value ?? [];
  },

  /**
   * 프로파일 상세 조회
   * @flow ipron-access-profile-detail
   */
  getProfileDetail: async (params: Record<string, unknown>): Promise<AccessProfile> => {
    const response = await apiClient.get<ApiResponse<AccessProfileResponse>>('/ipron-access-profile-detail', { params });
    return transformProfile(response.data?.data);
  },

  /**
   * 프로파일 등록
   * @flow ipron-access-profile-create
   */
  createProfile: async (data: ProfileCreateData): Promise<AccessProfile> => {
    const response = await apiClient.post<ApiResponse<AccessProfileResponse>>('/ipron-access-profile-create', data);
    return transformProfile(response.data?.data);
  },

  /**
   * 프로파일 수정
   * @flow ipron-access-profile-update
   */
  updateProfile: async ({ id, data }: { id: number; data: ProfileUpdateData }): Promise<AccessProfile> => {
    const response = await apiClient.put<ApiResponse<AccessProfileResponse>>('/ipron-access-profile-update', data, {
      params: { id },
    });
    return transformProfile(response.data?.data);
  },

  /**
   * 프로파일 삭제
   * @flow ipron-access-profile-delete
   */
  deleteProfile: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-access-profile-delete', { params });
  },

  /**
   * 프로파일 복사
   * @flow ipron-access-profile-copy
   */
  copyProfile: async ({ id, data }: { id: number; data: ProfileCopyData }): Promise<AccessProfile> => {
    const response = await apiClient.post<ApiResponse<AccessProfileResponse>>('/ipron-access-profile-copy', data, {
      params: { id },
    });
    return transformProfile(response.data?.data);
  },

  /**
   * 접근코드 목록 조회
   * Backend: ApiResponse<List<AccessCodeResponse>> -> BFF: data.value[]
   * @flow ipron-access-code-list
   */
  getCodes: async (params: Record<string, unknown>): Promise<AccessCode[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AccessCodeResponse[] }>>('/ipron-access-code-list', { params });
    const rawList = response.data?.data?.value ?? [];
    return rawList.map(transformCode);
  },

  /**
   * 접근코드 등록
   * @flow ipron-access-code-create
   */
  createCode: async ({ profileId, data }: { profileId: number; data: CodeCreateData }): Promise<AccessCode> => {
    const response = await apiClient.post<ApiResponse<AccessCodeResponse>>('/ipron-access-code-create', data, {
      params: { profileId },
    });
    return transformCode(response.data?.data);
  },

  /**
   * 접근코드 수정
   * @flow ipron-access-code-update
   */
  updateCode: async ({ profileId, code, data }: { profileId: number; code: string; data: CodeUpdateData }): Promise<AccessCode> => {
    const response = await apiClient.put<ApiResponse<AccessCodeResponse>>('/ipron-access-code-update', data, {
      params: { profileId, code },
    });
    return transformCode(response.data?.data);
  },

  /**
   * 접근코드 삭제
   * @flow ipron-access-code-delete
   */
  deleteCode: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-access-code-delete', { params });
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

  /**
   * 발신라우트 목록 조회 (노드별 필터)
   * @flow ipron-route-list
   */
  getRoutesByNode: async (nodeId: number): Promise<RouteSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: RouteSimpleResponse[] }>>('/ipron-route-list', {
      params: { nodeId },
    });
    return response.data?.data?.value ?? [];
  },

  /**
   * 노드-테넌트 매핑 조회 (DOD DNIS Flow 재사용)
   * @flow ipron-dod-trans-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NodeTenantItem[] }>>('/ipron-dod-trans-node-tenants');
    return response.data?.data?.value ?? [];
  },
};

export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
}
