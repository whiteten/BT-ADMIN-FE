/**
 * IVR EndPoint API 클라이언트
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-endpoint-list:                GET    Master 목록
 * - ivr-endpoint-detail:              GET    Master 상세
 * - ivr-endpoint-create:              POST   Master 등록
 * - ivr-endpoint-update:              PUT    Master 수정
 * - ivr-endpoint-delete:              DELETE Master 삭제
 * - ivr-endpoint-check-assigned:      GET    DN그룹 할당 카운트
 * - ivr-endpoint-member-list:         GET    Member 목록
 * - ivr-endpoint-member-create:       POST   Member 등록
 * - ivr-endpoint-member-update:       PUT    Member 수정
 * - ivr-endpoint-member-delete:       DELETE Member 삭제
 * - ivr-endpoint-member-check-ipport: GET    IP/PORT 중복 체크
 * - manager-node-list:                   GET    노드 목록 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  IvrEndpointMaster,
  IvrEndpointMasterCreateRequest,
  IvrEndpointMasterUpdateRequest,
  IvrEndpointMember,
  IvrEndpointMemberCreateRequest,
  IvrEndpointMemberUpdateRequest,
} from '../types/ivrEndpoint.types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const ivrEndpointApi = {
  // ─── Master ─────────────────────────────────────────────────────────────

  getMasters: async (params?: Record<string, unknown>): Promise<IvrEndpointMaster[]> => {
    const response = await apiClient.get<DetailResponse<{ value: IvrEndpointMaster[] }>>('/ivr-endpoint-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  getMasterDetail: async (params: Record<string, unknown>): Promise<IvrEndpointMaster> => {
    const response = await apiClient.get<DetailResponse<IvrEndpointMaster>>('/ivr-endpoint-detail', { params });
    return extractDetail(response);
  },

  createMaster: async (data: IvrEndpointMasterCreateRequest): Promise<IvrEndpointMaster> => {
    const response = await apiClient.post<DetailResponse<IvrEndpointMaster>>('/ivr-endpoint-create', data);
    return extractDetail(response);
  },

  updateMaster: async ({ id, data }: { id: number; data: IvrEndpointMasterUpdateRequest }): Promise<IvrEndpointMaster> => {
    const response = await apiClient.put<DetailResponse<IvrEndpointMaster>>('/ivr-endpoint-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  deleteMaster: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-endpoint-delete', { params });
  },

  checkAssigned: async (params: Record<string, unknown>): Promise<{ count: number }> => {
    const response = await apiClient.get<DetailResponse<{ count: number }>>('/ivr-endpoint-check-assigned', { params });
    return extractDetail(response);
  },

  // ─── Member ─────────────────────────────────────────────────────────────

  getMembers: async (params: Record<string, unknown>): Promise<IvrEndpointMember[]> => {
    const response = await apiClient.get<DetailResponse<{ value: IvrEndpointMember[] }>>('/ivr-endpoint-member-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  createMember: async ({ id, data }: { id: number; data: IvrEndpointMemberCreateRequest }): Promise<IvrEndpointMember> => {
    const response = await apiClient.post<DetailResponse<IvrEndpointMember>>('/ivr-endpoint-member-create', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  updateMember: async ({ memberId, data }: { memberId: number; data: IvrEndpointMemberUpdateRequest }): Promise<IvrEndpointMember> => {
    const response = await apiClient.put<DetailResponse<IvrEndpointMember>>('/ivr-endpoint-member-update', data, {
      params: { memberId },
    });
    return extractDetail(response);
  },

  deleteMember: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-endpoint-member-delete', { params });
  },

  checkIpPort: async (params: Record<string, unknown>): Promise<{ duplicate: boolean }> => {
    const response = await apiClient.get<DetailResponse<{ duplicate: boolean }>>('/ivr-endpoint-member-check-ipport', { params });
    return extractDetail(response);
  },

  // ─── Node (cross-service) ───────────────────────────────────────────────

  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<NodeSimpleResponse>>('/manager-node-list');
    return extractList(response);
  },
};
