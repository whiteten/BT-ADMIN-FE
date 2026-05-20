/**
 * 긴급코드 프로파일 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-emerg-profile-list:     GET    프로파일 목록 조회
 * - ipron-emerg-profile-detail:   GET    프로파일 상세 조회
 * - ipron-emerg-profile-create:   POST   프로파일 등록
 * - ipron-emerg-profile-update:   PUT    프로파일 수정
 * - ipron-emerg-profile-delete:   DELETE 프로파일 삭제
 * - ipron-emerg-profile-copy:     POST   프로파일 복사
 * - ipron-emerg-code-list:        GET    코드 목록 조회
 * - ipron-emerg-code-create:      POST   코드 등록
 * - ipron-emerg-code-update:      PUT    코드 수정
 * - ipron-emerg-code-delete:      DELETE 코드 삭제
 * - manager-node-list:            GET    노드 목록 조회 (cross-service)
 * - ipron-route-list:             GET    발신라우트 목록 조회 (라우트 select용)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  CodeBackendResponse,
  CodeCreateData,
  CodeUpdateData,
  EmergCode,
  EmergProfile,
  EmergProfileDetail,
  NodeSimpleResponse,
  ProfileBackendResponse,
  ProfileCopyData,
  ProfileCreateData,
  ProfileDetailBackendResponse,
  ProfileUpdateData,
  RouteSimpleResponse,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 백엔드 응답을 프론트엔드 EmergProfile로 변환
 */
function transformProfile(raw: ProfileBackendResponse): EmergProfile {
  return {
    emergencyCodeProfileId: raw.emergencyCodeProfileId,
    emergencyCodeProfileName: raw.emergencyCodeProfileName,
    nodeId: raw.nodeId,
    nodeName: raw.nodeName ?? '',
    codeCount: raw.codeCount,
    hasUnassignedRoute: raw.hasUnassignedRoute ?? false,
  };
}

/**
 * 백엔드 응답을 프론트엔드 EmergCode로 변환
 */
function transformCode(raw: CodeBackendResponse): EmergCode {
  return {
    emergencyCodeProfileId: raw.emergencyCodeProfileId,
    emergencyCode: raw.emergencyCode,
    emergencyCodeName: raw.emergencyCodeName,
    routeId: raw.routeId,
    routeName: raw.routeName,
    emergencyCodeDesc: raw.emergencyCodeDesc,
  };
}

/**
 * 백엔드 응답을 프론트엔드 EmergProfileDetail로 변환
 */
function transformProfileDetail(raw: ProfileDetailBackendResponse): EmergProfileDetail {
  return {
    emergencyCodeProfileId: raw.emergencyCodeProfileId,
    emergencyCodeProfileName: raw.emergencyCodeProfileName,
    nodeId: raw.nodeId,
    nodeName: raw.nodeName ?? '',
    codes: raw.codes?.map(transformCode) ?? [],
  };
}

export const emergProfileApi = {
  /**
   * 프로파일 목록 조회
   * @flow ipron-emerg-profile-list
   * Backend: ApiResponse<List<ProfileResponse>> -> BFF: data.value[] -> extractDetail().value
   */
  getProfiles: async (params?: Record<string, unknown>): Promise<EmergProfile[]> => {
    const response = await apiClient.get<DetailResponse<{ value: ProfileBackendResponse[] }>>('/ipron-emerg-profile-list', { params });
    const rawList = extractDetail(response)?.value ?? [];
    return rawList.map(transformProfile);
  },

  /**
   * 프로파일 상세 조회
   * @flow ipron-emerg-profile-detail
   */
  getProfileDetail: async (params: Record<string, unknown>): Promise<EmergProfileDetail> => {
    const response = await apiClient.get<DetailResponse<ProfileDetailBackendResponse>>('/ipron-emerg-profile-detail', { params });
    return transformProfileDetail(extractDetail(response));
  },

  /**
   * 프로파일 등록
   * @flow ipron-emerg-profile-create
   */
  createProfile: async (data: ProfileCreateData): Promise<EmergProfile> => {
    const response = await apiClient.post<DetailResponse<ProfileBackendResponse>>('/ipron-emerg-profile-create', data);
    return transformProfile(extractDetail(response));
  },

  /**
   * 프로파일 수정
   * @flow ipron-emerg-profile-update
   */
  updateProfile: async ({ id, data }: { id: number; data: ProfileUpdateData }): Promise<EmergProfile> => {
    const response = await apiClient.put<DetailResponse<ProfileBackendResponse>>('/ipron-emerg-profile-update', data, {
      params: { profileId: id },
    });
    return transformProfile(extractDetail(response));
  },

  /**
   * 프로파일 삭제
   * @flow ipron-emerg-profile-delete
   */
  deleteProfile: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/ipron-emerg-profile-delete', { params });
    return response;
  },

  /**
   * 프로파일 복사
   * @flow ipron-emerg-profile-copy
   */
  copyProfile: async ({ id, data }: { id: number; data: ProfileCopyData }): Promise<EmergProfile> => {
    const response = await apiClient.post<DetailResponse<ProfileBackendResponse>>('/ipron-emerg-profile-copy', data, {
      params: { profileId: id },
    });
    return transformProfile(extractDetail(response));
  },

  /**
   * 코드 목록 조회
   * @flow ipron-emerg-code-list
   * Backend: ApiResponse<List<CodeResponse>> -> BFF: data.value[] -> extractDetail().value
   */
  getCodes: async (params: Record<string, unknown>): Promise<EmergCode[]> => {
    const response = await apiClient.get<DetailResponse<{ value: CodeBackendResponse[] }>>('/ipron-emerg-code-list', { params });
    const rawList = extractDetail(response)?.value ?? [];
    return rawList.map(transformCode);
  },

  /**
   * 코드 등록
   * @flow ipron-emerg-code-create
   */
  createCode: async ({ profileId, data }: { profileId: number; data: CodeCreateData }): Promise<EmergCode> => {
    const response = await apiClient.post<DetailResponse<CodeBackendResponse>>('/ipron-emerg-code-create', data, {
      params: { profileId },
    });
    return transformCode(extractDetail(response));
  },

  /**
   * 코드 수정
   * @flow ipron-emerg-code-update
   */
  updateCode: async ({ profileId, code, data }: { profileId: number; code: string; data: CodeUpdateData }): Promise<EmergCode> => {
    const response = await apiClient.put<DetailResponse<CodeBackendResponse>>('/ipron-emerg-code-update', data, {
      params: { profileId, code },
    });
    return transformCode(extractDetail(response));
  },

  /**
   * 코드 삭제
   * @flow ipron-emerg-code-delete
   */
  deleteCode: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/ipron-emerg-code-delete', { params });
    return response;
  },

  /**
   * 노드 목록 조회 (cross-service: manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<NodeSimpleResponse>>('/manager-node-list');
    return extractList(response);
  },

  /**
   * 발신라우트 목록 조회 (노드별 필터)
   * @flow ipron-route-list
   */
  getRoutesByNode: async (nodeId: number): Promise<RouteSimpleResponse[]> => {
    const response = await apiClient.get<DetailResponse<{ value: RouteSimpleResponse[] }>>('/ipron-route-list', {
      params: { nodeId },
    });
    return extractDetail(response)?.value ?? [];
  },
};
