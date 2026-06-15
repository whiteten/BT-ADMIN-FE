/**
 * DID라우트 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-did-route-list:     GET    DID라우트 목록 조회
 * - ipron-did-route-detail:   GET    DID라우트 상세 조회
 * - ipron-did-route-create:   POST   DID라우트 등록
 * - ipron-did-route-update:   PUT    DID라우트 수정
 * - ipron-did-route-delete:   DELETE DID라우트 삭제
 * - ipron-did-route-delete-batch: DELETE DID라우트 일괄 삭제 (body: didrouteIds[])
 * - manager-node-list:       GET    노드 목록 조회 (cross-service)
 * - ipron-route-list:        GET    발신라우트 목록 조회 (라우트 select용)
 * - ipron-dn-group-options:  GET    DN그룹 콤보 옵션 (tenantId 기준)
 * - ipron-worktime-options:  GET    업무시간 콤보 옵션 (tenantId 기준, WORKTIME_TYPE=IE)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DidRoute, DidRouteCreateRequest, DidRouteUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

interface RouteSimpleResponse {
  routeId: number;
  routeName: string;
  nodeId: number;
}

/** DN 그룹(IPT 관리 조직) 콤보 옵션 아이템 */
export interface DnGroupOptionItem {
  id: number;
  name: string;
  /** 테넌트 ID — DN그룹 onChange 시 업무시간 재조회에 사용 */
  tenantId: number;
}

/** 업무시간 콤보 옵션 아이템 */
export interface WorktimeOptionItem {
  id: number;
  name: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const didRouteApi = {
  // ─── DID Route ──────────────────────────────────────────────────────────────

  /**
   * DID라우트 목록 조회
   * @flow ipron-did-route-list
   * Backend: ApiResponse<List<DidRouteResponse>> -> BFF: data.value[]
   */
  getList: async (params?: Record<string, unknown>): Promise<DidRoute[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DidRoute[] }>>('/ipron-did-route-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * DID라우트 상세 조회
   * @flow ipron-did-route-detail
   * Backend: ApiResponse<DidRouteResponse> -> BFF: data:{...}
   */
  getDetail: async (params: Record<string, unknown>): Promise<DidRoute> => {
    const response = await apiClient.get<ApiResponse<DidRoute>>('/ipron-did-route-detail', { params });
    return response.data?.data;
  },

  /**
   * DID라우트 등록
   * @flow ipron-did-route-create
   */
  create: async (data: DidRouteCreateRequest): Promise<DidRoute> => {
    const response = await apiClient.post<ApiResponse<DidRoute>>('/ipron-did-route-create', data);
    return response.data?.data;
  },

  /**
   * DID라우트 수정
   * @flow ipron-did-route-update
   */
  update: async ({ id, data }: { id: number; data: DidRouteUpdateRequest }): Promise<DidRoute> => {
    const response = await apiClient.put<ApiResponse<DidRoute>>('/ipron-did-route-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * DID라우트 삭제
   * @flow ipron-did-route-delete
   */
  delete: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-did-route-delete', { params });
  },

  /**
   * DID라우트 일괄 삭제
   * @flow ipron-did-route-delete-batch (DELETE /api/ipron/did-routes/delete-batch, body: { didrouteIds })
   */
  deleteBatch: async (didrouteIds: number[]): Promise<void> => {
    await apiClient.delete('/ipron-did-route-delete-batch', { data: { didrouteIds } });
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

  // ─── Route (라우트 select용) ────────────────────────────────────────────────

  /**
   * 발신라우트 목록 조회 (ipron-route-list 재사용)
   * @flow ipron-route-list
   */
  getRoutesByNode: async (nodeId: number): Promise<RouteSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: RouteSimpleResponse[] }>>('/ipron-route-list', {
      params: { nodeId },
    });
    return response.data?.data?.value ?? [];
  },

  // ─── DN 그룹 콤보 옵션 ──────────────────────────────────────────────────────

  /**
   * DN 그룹(IPT 관리 조직) 콤보 옵션 조회
   * SWAT: treeDnGroupByTenantId.do (IPR20S1036.jsp:14)
   * @flow ipron-dn-group-options
   */
  getDnGroupOptions: async (tenantId: number): Promise<DnGroupOptionItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnGroupOptionItem[] }>>('/ipron-dn-group-options', {
      params: { tenantId },
    });
    const raw = response.data?.data;
    if (Array.isArray(raw)) return raw;
    return (raw as { value?: DnGroupOptionItem[] })?.value ?? [];
  },

  // ─── 업무시간 콤보 옵션 ──────────────────────────────────────────────────────

  /**
   * 업무시간 콤보 옵션 조회 (WORKTIME_TYPE='IE', tenantId 기준)
   * SWAT: common.selWorktimeList (IPR20S1036.jsp:385)
   * @flow ipron-worktime-options
   */
  getWorktimeOptions: async (tenantId: number): Promise<WorktimeOptionItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: WorktimeOptionItem[] }>>('/ipron-worktime-options', {
      params: { tenantId },
    });
    const raw = response.data?.data;
    if (Array.isArray(raw)) return raw;
    return (raw as { value?: WorktimeOptionItem[] })?.value ?? [];
  },
};
