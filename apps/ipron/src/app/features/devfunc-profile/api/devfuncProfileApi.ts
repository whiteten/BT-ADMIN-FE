/**
 * 기능코드 프로파일 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-devfunc-profile-tree:    GET    프로파일 트리 조회
 * - ipron-devfunc-profile-detail:  GET    프로파일 상세 조회
 * - ipron-devfunc-profile-create:  POST   프로파일 등록
 * - ipron-devfunc-profile-update:  PUT    프로파일 수정
 * - ipron-devfunc-profile-delete:  DELETE 프로파일 삭제
 * - ipron-devfunc-profile-copy:    POST   프로파일 복사
 * - ipron-devfunc-code-list:       GET    코드 목록 조회
 * - ipron-devfunc-code-create:     POST   코드 등록
 * - ipron-devfunc-code-update:     PUT    코드 수정
 * - ipron-devfunc-code-delete:     DELETE 코드 삭제
 * - manager-tenant-list:           GET    테넌트 목록 조회 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  CodeCreateData,
  CodeUpdateData,
  DevfuncCode,
  DevfuncCodeResponse,
  DevfuncProfile,
  DevfuncProfileResponse,
  ProfileCopyData,
  ProfileCreateData,
  ProfileTreeNodeResponse,
  ProfileUpdateData,
  TenantSimpleResponse,
} from '../types/devfuncProfile.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

function transformProfile(raw: DevfuncProfileResponse): DevfuncProfile {
  return {
    devfuncCodeProfileId: raw.devfuncCodeProfileId,
    devfuncCodeProfileName: raw.devfuncCodeProfileName,
    tenantId: raw.tenantId,
    tenantName: raw.tenantName ?? '',
    codeCount: raw.codeCount ?? 0,
  };
}

function transformCode(raw: DevfuncCodeResponse): DevfuncCode {
  return {
    devfuncCodeProfileId: raw.devfuncCodeProfileId,
    devfuncCode: raw.devfuncCode,
    devfuncCodeName: raw.devfuncCodeName,
    minDigits: raw.minDigits,
    maxDigits: raw.maxDigits,
    devfuncCodeDesc: raw.devfuncCodeDesc,
  };
}

export const devfuncProfileApi = {
  /**
   * 프로파일 목록 조회
   * @flow ipron-devfunc-profile-list
   */
  getProfiles: async (params?: Record<string, unknown>): Promise<DevfuncProfile[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DevfuncProfileResponse[] }>>('/ipron-devfunc-profile-list', { params });
    const rawList = extractDetail(response)?.value ?? [];
    return rawList.map(transformProfile);
  },

  /**
   * 프로파일 트리 조회 (테넌트 → 프로파일 2레벨)
   * @flow ipron-devfunc-profile-tree
   */
  getProfileTree: async (): Promise<ProfileTreeNodeResponse[]> => {
    const response = await apiClient.get<DetailResponse<{ value: ProfileTreeNodeResponse[] }>>('/ipron-devfunc-profile-tree');
    return extractDetail(response)?.value ?? [];
  },

  /**
   * 프로파일 상세 조회
   * @flow ipron-devfunc-profile-detail
   */
  getProfileDetail: async (params: Record<string, unknown>): Promise<DevfuncProfile> => {
    const response = await apiClient.get<DetailResponse<DevfuncProfileResponse>>('/ipron-devfunc-profile-detail', { params });
    return transformProfile(extractDetail(response));
  },

  /**
   * 프로파일 등록
   * @flow ipron-devfunc-profile-create
   */
  createProfile: async (data: ProfileCreateData): Promise<DevfuncProfile> => {
    const response = await apiClient.post<DetailResponse<DevfuncProfileResponse>>('/ipron-devfunc-profile-create', data);
    return transformProfile(extractDetail(response));
  },

  /**
   * 프로파일 수정
   * @flow ipron-devfunc-profile-update
   */
  updateProfile: async ({ id, data }: { id: number; data: ProfileUpdateData }): Promise<DevfuncProfile> => {
    const response = await apiClient.put<DetailResponse<DevfuncProfileResponse>>('/ipron-devfunc-profile-update', data, {
      params: { id },
    });
    return transformProfile(extractDetail(response));
  },

  /**
   * 프로파일 삭제
   * @flow ipron-devfunc-profile-delete
   */
  deleteProfile: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-devfunc-profile-delete', { params });
  },

  /**
   * 프로파일 복사
   * @flow ipron-devfunc-profile-copy
   */
  copyProfile: async ({ id, data }: { id: number; data: ProfileCopyData }): Promise<DevfuncProfile> => {
    const response = await apiClient.post<DetailResponse<DevfuncProfileResponse>>('/ipron-devfunc-profile-copy', data, {
      params: { id },
    });
    return transformProfile(extractDetail(response));
  },

  /**
   * 코드 목록 조회 (검색 포함)
   * @flow ipron-devfunc-code-list
   */
  getCodes: async (params: Record<string, unknown>): Promise<DevfuncCode[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DevfuncCodeResponse[] }>>('/ipron-devfunc-code-list', { params });
    const rawList = extractDetail(response)?.value ?? [];
    return rawList.map(transformCode);
  },

  /**
   * 코드 등록
   * @flow ipron-devfunc-code-create
   */
  createCode: async ({ profileId, data }: { profileId: number; data: CodeCreateData }): Promise<DevfuncCode> => {
    const response = await apiClient.post<DetailResponse<DevfuncCodeResponse>>('/ipron-devfunc-code-create', data, {
      params: { profileId },
    });
    return transformCode(extractDetail(response));
  },

  /**
   * 코드 수정
   * @flow ipron-devfunc-code-update
   */
  updateCode: async ({ profileId, code, data }: { profileId: number; code: string; data: CodeUpdateData }): Promise<DevfuncCode> => {
    const response = await apiClient.put<DetailResponse<DevfuncCodeResponse>>('/ipron-devfunc-code-update', data, {
      params: { profileId, code },
    });
    return transformCode(extractDetail(response));
  },

  /**
   * 코드 삭제
   * @flow ipron-devfunc-code-delete
   */
  deleteCode: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-devfunc-code-delete', { params });
  },

  /**
   * 테넌트 목록 조회 (cross-service: 복사 대상 선택용)
   * @flow manager-tenant-list
   */
  getTenants: async (): Promise<TenantSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<TenantSimpleResponse>>('/manager-tenant-list');
    return extractList(response);
  },
};
