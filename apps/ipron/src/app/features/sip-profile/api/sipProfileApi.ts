/**
 * SIP 프로파일 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-sip-profile-list:           GET    프로파일 목록 조회
 * - ipron-sip-profile-detail:         GET    프로파일 상세 조회
 * - ipron-sip-profile-create:         POST   프로파일 등록
 * - ipron-sip-profile-update:         PUT    프로파일 수정
 * - ipron-sip-profile-delete:         DELETE 프로파일 삭제
 * - ipron-sip-header-group-list:      GET    헤더 그룹 목록 조회
 * - ipron-sip-header-group-create:    POST   헤더 그룹 등록
 * - ipron-sip-header-group-update:    PUT    헤더 그룹 수정
 * - ipron-sip-header-group-delete:    DELETE 헤더 그룹 삭제
 * - ipron-sip-header-relay-list:      GET    헤더 릴레이 목록 조회
 * - ipron-sip-header-relay-create:    POST   헤더 릴레이 등록
 * - ipron-sip-header-relay-update:    PUT    헤더 릴레이 수정
 * - ipron-sip-header-relay-delete:    DELETE 헤더 릴레이 삭제
 * - ipron-sip-header-grp-mem-update:  PUT    그룹 멤버 일괄 업데이트
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  SipHeaderGroup,
  SipHeaderGroupCreateRequest,
  SipHeaderGroupUpdateRequest,
  SipHeaderGrpMemUpdateRequest,
  SipHeaderRelay,
  SipHeaderRelayCreateRequest,
  SipHeaderRelayUpdateRequest,
  SipProfile,
  SipProfileCreateRequest,
  SipProfileUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const sipProfileApi = {
  // ─── Profile ────────────────────────────────────────────────────────────────

  getProfiles: async (params?: Record<string, unknown>): Promise<SipProfile[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SipProfile[] }>>('/ipron-sip-profile-list', { params });
    return response.data?.data?.value ?? [];
  },

  getProfileDetail: async (params: Record<string, unknown>): Promise<SipProfile> => {
    const response = await apiClient.get<ApiResponse<SipProfile>>('/ipron-sip-profile-detail', { params });
    return response.data?.data;
  },

  createProfile: async (data: SipProfileCreateRequest): Promise<SipProfile> => {
    const response = await apiClient.post<ApiResponse<SipProfile>>('/ipron-sip-profile-create', data);
    return response.data?.data;
  },

  updateProfile: async ({ id, data }: { id: number; data: SipProfileUpdateRequest }): Promise<SipProfile> => {
    const response = await apiClient.put<ApiResponse<SipProfile>>('/ipron-sip-profile-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteProfile: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-sip-profile-delete', { params });
  },

  // ─── Header Group ──────────────────────────────────────────────────────────

  getHeaderGroups: async (): Promise<SipHeaderGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SipHeaderGroup[] }>>('/ipron-sip-header-group-list');
    return response.data?.data?.value ?? [];
  },

  createHeaderGroup: async (data: SipHeaderGroupCreateRequest): Promise<SipHeaderGroup> => {
    const response = await apiClient.post<ApiResponse<SipHeaderGroup>>('/ipron-sip-header-group-create', data);
    return response.data?.data;
  },

  updateHeaderGroup: async ({ id, data }: { id: number; data: SipHeaderGroupUpdateRequest }): Promise<SipHeaderGroup> => {
    const response = await apiClient.put<ApiResponse<SipHeaderGroup>>('/ipron-sip-header-group-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteHeaderGroup: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-sip-header-group-delete', { params });
  },

  // ─── Header Relay ──────────────────────────────────────────────────────────

  getHeaderRelays: async (params?: Record<string, unknown>): Promise<SipHeaderRelay[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SipHeaderRelay[] }>>('/ipron-sip-header-relay-list', { params });
    return response.data?.data?.value ?? [];
  },

  createHeaderRelay: async (data: SipHeaderRelayCreateRequest): Promise<SipHeaderRelay> => {
    const response = await apiClient.post<ApiResponse<SipHeaderRelay>>('/ipron-sip-header-relay-create', data);
    return response.data?.data;
  },

  updateHeaderRelay: async ({ id, data }: { id: number; data: SipHeaderRelayUpdateRequest }): Promise<SipHeaderRelay> => {
    const response = await apiClient.put<ApiResponse<SipHeaderRelay>>('/ipron-sip-header-relay-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteHeaderRelay: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-sip-header-relay-delete', { params });
  },

  // ─── Group Members ─────────────────────────────────────────────────────────

  updateGroupMembers: async ({ groupId, data }: { groupId: number; data: SipHeaderGrpMemUpdateRequest }) => {
    return await apiClient.put('/ipron-sip-header-grp-mem-update', data, {
      params: { id: groupId },
    });
  },
};
