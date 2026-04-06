/**
 * DID라우트 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-didroute-list:     GET    DID라우트 목록 조회
 * - ipron-didroute-detail:   GET    DID라우트 상세 조회
 * - ipron-didroute-create:   POST   DID라우트 등록
 * - ipron-didroute-update:   PUT    DID라우트 수정
 * - ipron-didroute-delete:   DELETE DID라우트 삭제
 * - manager-node-list:       GET    노드 목록 조회 (cross-service)
 * - ipron-route-list:        GET    발신라우트 목록 조회 (라우트 select용)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DidRoute, DidRouteCreateRequest, DidRouteUpdateRequest } from '../types/didRoute.types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

interface RouteSimpleResponse {
  routeId: number;
  routeName: string;
  nodeId: number;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const didRouteApi = {
  // ─── DID Route ──────────────────────────────────────────────────────────────

  /**
   * DID라우트 목록 조회
   * @flow ipron-didroute-list
   * Backend: ApiResponse<List<DidRouteResponse>> -> BFF: data.value[]
   */
  getList: async (params?: Record<string, unknown>): Promise<DidRoute[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DidRoute[] }>>('/ipron-didroute-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * DID라우트 상세 조회
   * @flow ipron-didroute-detail
   * Backend: ApiResponse<DidRouteResponse> -> BFF: data:{...}
   */
  getDetail: async (params: Record<string, unknown>): Promise<DidRoute> => {
    const response = await apiClient.get<DetailResponse<DidRoute>>('/ipron-didroute-detail', { params });
    return extractDetail(response);
  },

  /**
   * DID라우트 등록
   * @flow ipron-didroute-create
   */
  create: async (data: DidRouteCreateRequest): Promise<DidRoute> => {
    const response = await apiClient.post<DetailResponse<DidRoute>>('/ipron-didroute-create', data);
    return extractDetail(response);
  },

  /**
   * DID라우트 수정
   * @flow ipron-didroute-update
   */
  update: async ({ id, data }: { id: number; data: DidRouteUpdateRequest }): Promise<DidRoute> => {
    const response = await apiClient.put<DetailResponse<DidRoute>>('/ipron-didroute-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * DID라우트 삭제
   * @flow ipron-didroute-delete
   */
  delete: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-didroute-delete', { params });
  },

  // ─── Node (cross-service) ────────────────────────────────────────────────────

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<NodeSimpleResponse>>('/manager-node-list');
    return extractList(response);
  },

  // ─── Route (라우트 select용) ────────────────────────────────────────────────

  /**
   * 발신라우트 목록 조회 (ipron-route-list 재사용)
   * @flow ipron-route-list
   */
  getRoutesByNode: async (nodeId: number): Promise<RouteSimpleResponse[]> => {
    const response = await apiClient.get<DetailResponse<{ value: RouteSimpleResponse[] }>>('/ipron-route-list', {
      params: { nodeId },
    });
    return extractDetail(response)?.value ?? [];
  },
};
