import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import { type Client, type ClientBackendResponse, type ClientCreateRequest, type ClientUpdateRequest, transformClientResponse } from '../types/client.types';

/**
 * BFF Aggregation Flow를 통한 OAuth2 클라이언트 API 클라이언트
 * 모든 API는 반드시 BFF를 통해서만 호출
 *
 * 등록된 flow:
 * - client-list: GET /api/bff/flows/client-list
 * - client-detail: GET /api/bff/flows/client-detail
 * - client-create: POST /api/bff/flows/client-create
 * - client-update: PUT /api/bff/flows/client-update
 * - client-delete: DELETE /api/bff/flows/client-delete
 * - client-regenerate-secret: POST /api/bff/flows/client-regenerate-secret
 * - client-toggle-active: PATCH /api/bff/flows/client-toggle-active
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const clientApi = {
  /**
   * 클라이언트 목록 조회
   * @flow client-list
   */
  getClients: async (params?: Record<string, unknown>): Promise<Client[]> => {
    const response = await apiClient.get<ListResponse<ClientBackendResponse>>('/client-list', { params });
    const backendClients = extractList(response);
    return backendClients.map(transformClientResponse);
  },

  /**
   * 클라이언트 단건 조회
   * @flow client-detail
   */
  getClient: async (params: Record<string, unknown>): Promise<Client> => {
    const response = await apiClient.get<DetailResponse<ClientBackendResponse>>('/client-detail', { params });
    const backendClient = extractDetail(response);
    return transformClientResponse(backendClient);
  },

  /**
   * 클라이언트 생성
   * @flow client-create
   */
  createClient: async (data: ClientCreateRequest): Promise<Client> => {
    const response = await apiClient.post<DetailResponse<ClientBackendResponse>>('/client-create', data);
    const backendClient = extractDetail(response);
    return transformClientResponse(backendClient);
  },

  /**
   * 클라이언트 수정
   * @flow client-update
   */
  updateClient: async ({ params, data }: { params: Record<string, unknown>; data: ClientUpdateRequest }) => {
    const response = await apiClient.put('/client-update', data, { params });
    return response;
  },

  /**
   * 클라이언트 삭제
   * @flow client-delete
   */
  deleteClient: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/client-delete', { params });
    return response;
  },

  /**
   * 클라이언트 시크릿 재생성
   * @flow client-regenerate-secret
   */
  regenerateSecret: async (params: Record<string, unknown>): Promise<Client> => {
    const response = await apiClient.post<DetailResponse<ClientBackendResponse>>('/client-regenerate-secret', {}, { params });
    const backendClient = extractDetail(response);
    return transformClientResponse(backendClient);
  },

  /**
   * 클라이언트 활성/비활성 토글
   * @flow client-toggle-active
   */
  toggleActive: async (params: Record<string, unknown>) => {
    const clientId = params.clientId;
    const response = await apiClient.patch(`/client-toggle-active/${clientId}`);
    return response;
  },
};
