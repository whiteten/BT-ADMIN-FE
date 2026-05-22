/**
 * MS 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-ms-group-list:           GET    MS그룹 목록 조회
 * - ipron-ms-group-detail:         GET    MS그룹 상세 조회
 * - ipron-ms-group-create:         POST   MS그룹 등록
 * - ipron-ms-group-update:         PUT    MS그룹 수정
 * - ipron-ms-group-delete:         DELETE MS그룹 삭제
 * - ipron-ms-group-member-list:    GET    MS그룹 멤버 목록 조회
 * - ipron-ms-group-member-update:  PUT    MS그룹 멤버 일괄 업데이트
 * - ipron-media-server-list:       GET    미디어서버 목록 조회
 * - ipron-media-server-detail:     GET    미디어서버 상세 조회
 * - ipron-media-server-create:     POST   미디어서버 등록
 * - ipron-media-server-update:     PUT    미디어서버 수정
 * - ipron-media-server-delete:     DELETE 미디어서버 삭제
 * - manager-node-list:             GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  MediaServer,
  MediaServerCreateRequest,
  MediaServerUpdateRequest,
  MsGroup,
  MsGroupCreateRequest,
  MsGroupMember,
  MsGroupUpdateRequest,
  MsGrpMemberRequest,
  NodeMsSettingRequest,
  NodeMsSettingResponse,
} from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
  msGroupId: number | null;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const msGroupApi = {
  // ─── MS Group ───────────────────────────────────────────────────────────────

  /**
   * MS그룹 목록 조회
   * @flow ipron-ms-group-list
   * Backend: ApiResponse<List<MsGroupResponse>> -> BFF: data.value[]
   */
  getMsGroups: async (params?: Record<string, unknown>): Promise<MsGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MsGroup[] }>>('/ipron-ms-group-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * MS그룹 상세 조회
   * @flow ipron-ms-group-detail
   * Backend: ApiResponse<MsGroupResponse> -> BFF: data:{...}
   */
  getMsGroupDetail: async (params: Record<string, unknown>): Promise<MsGroup> => {
    const response = await apiClient.get<ApiResponse<MsGroup>>('/ipron-ms-group-detail', { params });
    return response.data?.data;
  },

  /**
   * MS그룹 등록
   * @flow ipron-ms-group-create
   */
  createMsGroup: async (data: MsGroupCreateRequest): Promise<MsGroup> => {
    const response = await apiClient.post<ApiResponse<MsGroup>>('/ipron-ms-group-create', data);
    return response.data?.data;
  },

  /**
   * MS그룹 수정
   * @flow ipron-ms-group-update
   */
  updateMsGroup: async ({ id, data }: { id: number; data: MsGroupUpdateRequest }): Promise<MsGroup> => {
    const response = await apiClient.put<ApiResponse<MsGroup>>('/ipron-ms-group-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * MS그룹 삭제
   * @flow ipron-ms-group-delete
   */
  deleteMsGroup: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-ms-group-delete', { params });
  },

  /**
   * MS그룹 멤버 목록 조회 (해당 노드 전체 미디어서버 + 체크여부 + 우선순위)
   * @flow ipron-ms-group-members
   * Backend: ApiResponse<List<MsGrpMemberResponse>> -> BFF: data.value[]
   */
  getMsGroupMembers: async (params: Record<string, unknown>): Promise<MsGroupMember[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MsGroupMember[] }>>('/ipron-ms-group-members', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * MS그룹 멤버 일괄 업데이트 (delete all + bulk insert)
   * @flow ipron-ms-group-members-update
   */
  updateMsGroupMembers: async ({ id, data }: { id: number; data: MsGrpMemberRequest }) => {
    return await apiClient.put('/ipron-ms-group-members-update', data, {
      params: { id },
    });
  },

  // ─── Media Server ───────────────────────────────────────────────────────────

  /**
   * 미디어서버 목록 조회
   * @flow ipron-media-server-list
   * Backend: ApiResponse<List<MediaServerResponse>> -> BFF: data.value[]
   */
  getMediaServers: async (params?: Record<string, unknown>): Promise<MediaServer[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MediaServer[] }>>('/ipron-media-server-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 미디어서버 상세 조회
   * @flow ipron-media-server-detail
   * Backend: ApiResponse<MediaServerResponse> -> BFF: data:{...}
   */
  getMediaServerDetail: async (params: Record<string, unknown>): Promise<MediaServer> => {
    const response = await apiClient.get<ApiResponse<MediaServer>>('/ipron-media-server-detail', { params });
    return response.data?.data;
  },

  /**
   * 미디어서버 등록
   * @flow ipron-media-server-create
   */
  createMediaServer: async (data: MediaServerCreateRequest): Promise<MediaServer> => {
    const response = await apiClient.post<ApiResponse<MediaServer>>('/ipron-media-server-create', data);
    return response.data?.data;
  },

  /**
   * 미디어서버 수정
   * @flow ipron-media-server-update
   */
  updateMediaServer: async ({ id, data }: { id: number; data: MediaServerUpdateRequest }): Promise<MediaServer> => {
    const response = await apiClient.put<ApiResponse<MediaServer>>('/ipron-media-server-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 미디어서버 삭제
   * @flow ipron-media-server-delete
   */
  deleteMediaServer: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-media-server-delete', { params });
  },

  // ─── Node (cross-service) ────────────────────────────────────────────────────

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },

  // ─── Node MS Setting ────────────────────────────────────────────────────────

  /**
   * 노드 기본 MS 설정 조회
   * @flow ipron-node-ms-setting
   */
  getNodeMsSetting: async (params: Record<string, unknown>): Promise<NodeMsSettingResponse> => {
    const response = await apiClient.get<ApiResponse<NodeMsSettingResponse>>('/ipron-node-ms-setting', { params });
    return response.data?.data;
  },

  /**
   * 노드 기본 MS 설정 수정
   * @flow ipron-node-ms-setting-update
   */
  updateNodeMsSetting: async ({ id, data }: { id: number; data: NodeMsSettingRequest }) => {
    return await apiClient.put('/ipron-node-ms-setting-update', data, { params: { id } });
  },
};
