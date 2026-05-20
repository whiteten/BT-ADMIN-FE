/**
 * 발신 DNIS 사전변환 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-pre-num-trans-list:     GET    사전변환 목록 조회
 * - ipron-pre-num-trans-detail:   GET    사전변환 상세 조회
 * - ipron-pre-num-trans-create:   POST   사전변환 등록
 * - ipron-pre-num-trans-update:   PUT    사전변환 수정
 * - ipron-pre-num-trans-delete:   DELETE 사전변환 삭제
 * - manager-node-list:            GET    노드 목록 조회 (cross-service)
 * - ipron-route-list:             GET    라우트 목록 조회 (라우트 선택용)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { PreNumTrans, PreNumTransCreateRequest, PreNumTransUpdateRequest } from '../types';

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

export const preNumTransApi = {
  // ─── 사전변환 CRUD ─────────────────────────────────────────────────────────

  /**
   * 사전변환 목록 조회
   * @flow ipron-pre-num-trans-list
   * Backend: ApiResponse<List<PreNumTransResponse>> -> BFF: data.value[]
   */
  getList: async (params?: Record<string, unknown>): Promise<PreNumTrans[]> => {
    const response = await apiClient.get<DetailResponse<{ value: PreNumTrans[] }>>('/ipron-pre-num-trans-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * 사전변환 상세 조회
   * @flow ipron-pre-num-trans-detail
   */
  getDetail: async (params: Record<string, unknown>): Promise<PreNumTrans> => {
    const response = await apiClient.get<DetailResponse<PreNumTrans>>('/ipron-pre-num-trans-detail', { params });
    return extractDetail(response);
  },

  /**
   * 사전변환 등록
   * @flow ipron-pre-num-trans-create
   */
  create: async (data: PreNumTransCreateRequest): Promise<PreNumTrans> => {
    const response = await apiClient.post<DetailResponse<PreNumTrans>>('/ipron-pre-num-trans-create', data);
    return extractDetail(response);
  },

  /**
   * 사전변환 수정
   * @flow ipron-pre-num-trans-update
   */
  update: async ({ id, data }: { id: number; data: PreNumTransUpdateRequest }): Promise<PreNumTrans> => {
    const response = await apiClient.put<DetailResponse<PreNumTrans>>('/ipron-pre-num-trans-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * 사전변환 삭제
   * @flow ipron-pre-num-trans-delete
   */
  delete: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-pre-num-trans-delete', { params });
  },

  // ─── 공통 ─────────────────────────────────────────────────────────────────

  /**
   * 노드 목록 조회 (manager-node-list 재사용)
   * @flow manager-node-list
   */
  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<NodeSimpleResponse>>('/manager-node-list');
    return extractList(response);
  },

  /**
   * 라우트 목록 조회 (노드별 필터)
   * @flow ipron-route-list
   */
  getRoutes: async (params?: Record<string, unknown>): Promise<RouteSimpleResponse[]> => {
    const response = await apiClient.get<DetailResponse<{ value: RouteSimpleResponse[] }>>('/ipron-route-list', { params });
    return extractDetail(response)?.value ?? [];
  },
};
