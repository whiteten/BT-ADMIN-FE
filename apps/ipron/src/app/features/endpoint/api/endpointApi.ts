/**
 * 국선관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-endpoint-list:           GET    국선 목록 조회
 * - ipron-endpoint-detail:         GET    국선 상세 조회
 * - ipron-endpoint-create:         POST   국선 등록
 * - ipron-endpoint-update:         PUT    국선 수정
 * - ipron-endpoint-delete:         DELETE 국선 삭제
 * - ipron-endpt-member-list:       GET    멤버 목록 조회
 * - ipron-endpt-member-create:     POST   멤버 등록
 * - ipron-endpt-member-update:     PUT    멤버 수정
 * - ipron-endpt-member-delete:     DELETE 멤버 삭제
 * - ipron-endpt-regnum-list:       GET    인증번호 목록 조회
 * - ipron-endpt-regnum-create:     POST   인증번호 등록
 * - ipron-endpt-regnum-update:     PUT    인증번호 수정
 * - ipron-endpt-regnum-delete:     DELETE 인증번호 삭제
 * - manager-node-list:             GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  Endpoint,
  EndpointCreateRequest,
  EndpointMember,
  EndpointMemberCreateRequest,
  EndpointMemberUpdateRequest,
  EndpointRegnum,
  EndpointRegnumCreateRequest,
  EndpointRegnumUpdateRequest,
  EndpointUpdateRequest,
} from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const endpointApi = {
  // ─── Endpoint ────────────────────────────────────────────────────────────────

  /**
   * 국선 목록 조회
   * @flow ipron-endpoint-list
   * Backend: ApiResponse<List<EndpointResponse>> -> BFF: data.value[]
   */
  getEndpoints: async (params?: Record<string, unknown>): Promise<Endpoint[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Endpoint[] }>>('/ipron-endpoint-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 국선 상세 조회
   * @flow ipron-endpoint-detail
   * Backend: ApiResponse<EndpointDetailResponse> -> BFF: data:{...}
   */
  getEndpointDetail: async (params: Record<string, unknown>): Promise<Endpoint> => {
    const response = await apiClient.get<ApiResponse<Endpoint>>('/ipron-endpoint-detail', { params });
    return response.data?.data;
  },

  /**
   * 국선 등록
   * @flow ipron-endpoint-create
   */
  createEndpoint: async (data: EndpointCreateRequest): Promise<Endpoint> => {
    const response = await apiClient.post<ApiResponse<Endpoint>>('/ipron-endpoint-create', data);
    return response.data?.data;
  },

  /**
   * 국선 수정
   * @flow ipron-endpoint-update
   */
  updateEndpoint: async ({ id, data }: { id: number; data: EndpointUpdateRequest }): Promise<Endpoint> => {
    const response = await apiClient.put<ApiResponse<Endpoint>>('/ipron-endpoint-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 국선 삭제
   * @flow ipron-endpoint-delete
   */
  deleteEndpoint: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-endpoint-delete', { params });
  },

  /**
   * DR 노드 목록 조회 (같은 클러스터의 다른 노드)
   * @flow ipron-endpoint-dr-nodes
   */
  getDrNodes: async (params: Record<string, unknown>): Promise<Array<{ nodeId: number; nodeName: string }>> => {
    const response = await apiClient.get<ApiResponse<{ value: Array<{ nodeId: number; nodeName: string }> }>>('/ipron-endpoint-dr-nodes', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 노드 테넌트 목록 조회
   * @flow ipron-endpoint-node-tenants
   */
  getNodeTenants: async (params: Record<string, unknown>): Promise<Array<{ tenantId: number; tenantName: string }>> => {
    const response = await apiClient.get<ApiResponse<{ value: Array<{ tenantId: number; tenantName: string }> }>>('/ipron-endpoint-node-tenants', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 인증번호 서버 등록 요청 (IDS Command)
   * @flow ipron-endpt-regnum-register
   */
  registerRegnum: async (params: { id: number; regId: number }) => {
    return await apiClient.post('/ipron-endpt-regnum-register', {}, { params });
  },

  /**
   * G/W 우회설정 — 일괄 라우팅 노드 변경
   * @flow ipron-endpoint-gw-bypass
   */
  gwBypass: async (data: { endptIds: number[]; routingNodeId: number }) => {
    return await apiClient.put('/ipron-endpoint-gw-bypass', data);
  },

  // ─── Member ──────────────────────────────────────────────────────────────────

  /**
   * 멤버 목록 조회
   * @flow ipron-endpt-member-list
   * Backend: ApiResponse<List<MemberResponse>> -> BFF: data.value[]
   */
  getMembers: async (params: Record<string, unknown>): Promise<EndpointMember[]> => {
    const response = await apiClient.get<ApiResponse<{ value: EndpointMember[] }>>('/ipron-endpt-member-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 멤버 등록
   * @flow ipron-endpt-member-create
   */
  createMember: async ({ id, data }: { id: number; data: EndpointMemberCreateRequest }): Promise<EndpointMember> => {
    const response = await apiClient.post<ApiResponse<EndpointMember>>('/ipron-endpt-member-create', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 멤버 수정
   * @flow ipron-endpt-member-update
   */
  updateMember: async ({ id, memId, data }: { id: number; memId: number; data: EndpointMemberUpdateRequest }): Promise<EndpointMember> => {
    const response = await apiClient.put<ApiResponse<EndpointMember>>('/ipron-endpt-member-update', data, {
      params: { id, memId },
    });
    return response.data?.data;
  },

  /**
   * 멤버 삭제
   * @flow ipron-endpt-member-delete
   */
  deleteMember: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-endpt-member-delete', { params });
  },

  // ─── Regnum ──────────────────────────────────────────────────────────────────

  /**
   * 인증번호 목록 조회
   * @flow ipron-endpt-regnum-list
   * Backend: ApiResponse<List<RegnumResponse>> -> BFF: data.value[]
   */
  getRegnums: async (params: Record<string, unknown>): Promise<EndpointRegnum[]> => {
    const response = await apiClient.get<ApiResponse<{ value: EndpointRegnum[] }>>('/ipron-endpt-regnum-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 인증번호 등록
   * @flow ipron-endpt-regnum-create
   */
  createRegnum: async ({ id, data }: { id: number; data: EndpointRegnumCreateRequest }): Promise<EndpointRegnum> => {
    const response = await apiClient.post<ApiResponse<EndpointRegnum>>('/ipron-endpt-regnum-create', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 인증번호 수정
   * @flow ipron-endpt-regnum-update
   */
  updateRegnum: async ({ id, regId, data }: { id: number; regId: number; data: EndpointRegnumUpdateRequest }): Promise<EndpointRegnum> => {
    const response = await apiClient.put<ApiResponse<EndpointRegnum>>('/ipron-endpt-regnum-update', data, {
      params: { id, regId },
    });
    return response.data?.data;
  },

  /**
   * 인증번호 삭제
   * @flow ipron-endpt-regnum-delete
   */
  deleteRegnum: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-endpt-regnum-delete', { params });
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
};
