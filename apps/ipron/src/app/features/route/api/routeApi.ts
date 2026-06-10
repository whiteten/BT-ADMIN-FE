/**
 * 발신라우트 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-route-list:           GET    라우트 목록 조회
 * - ipron-route-detail:         GET    라우트 상세 조회
 * - ipron-route-create:         POST   라우트 등록
 * - ipron-route-update:         PUT    라우트 수정
 * - ipron-route-delete:         DELETE 라우트 삭제
 * - ipron-routepoint-list:      GET    라우트포인트 목록 조회
 * - ipron-routepoint-update:    PUT    라우트포인트 일괄 업데이트
 * - ipron-routepoint-delete:    DELETE 라우트포인트 개별 삭제
 * - manager-node-list:          GET    노드 목록 조회 (cross-service)
 * - ipron-endpoint-list:        GET    국선 목록 조회 (국선배정용)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { Route, RouteCreateRequest, RoutePoint, RoutePointBatchRequest, RouteUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const routeApi = {
  // ─── Route ──────────────────────────────────────────────────────────────────

  /**
   * 라우트 목록 조회
   * @flow ipron-route-list
   * Backend: ApiResponse<List<RouteResponse>> -> BFF: data.value[]
   */
  getRoutes: async (params?: Record<string, unknown>): Promise<Route[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Route[] }>>('/ipron-route-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 라우트 상세 조회
   * @flow ipron-route-detail
   * Backend: ApiResponse<RouteDetailResponse> -> BFF: data:{...}
   */
  getRouteDetail: async (params: Record<string, unknown>): Promise<Route> => {
    const response = await apiClient.get<ApiResponse<Route>>('/ipron-route-detail', { params });
    return response.data?.data;
  },

  /**
   * 라우트 등록
   * @flow ipron-route-create
   */
  createRoute: async (data: RouteCreateRequest): Promise<Route> => {
    const response = await apiClient.post<ApiResponse<Route>>('/ipron-route-create', data);
    return response.data?.data;
  },

  /**
   * 라우트 수정
   * @flow ipron-route-update
   */
  updateRoute: async ({ id, data }: { id: number; data: RouteUpdateRequest }): Promise<Route> => {
    const response = await apiClient.put<ApiResponse<Route>>('/ipron-route-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 라우트 삭제
   * @flow ipron-route-delete
   */
  deleteRoute: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-route-delete', { params });
  },

  // ─── RoutePoint ─────────────────────────────────────────────────────────────

  /**
   * 라우트포인트 목록 조회 (배정된 국선)
   * @flow ipron-routepoint-list
   * Backend: ApiResponse<List<RoutePointResponse>> -> BFF: data.value[]
   */
  getRoutePoints: async (params: Record<string, unknown>): Promise<RoutePoint[]> => {
    const response = await apiClient.get<ApiResponse<{ value: RoutePoint[] }>>('/ipron-routepoint-list', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 라우트포인트 일괄 업데이트 (기존 전체 삭제 -> 재등록)
   * @flow ipron-routepoint-update
   */
  updateRoutePoints: async ({ id, data }: { id: number; data: RoutePointBatchRequest }) => {
    return await apiClient.put('/ipron-routepoint-update', data, {
      params: { id },
    });
  },

  /**
   * 라우트포인트 개별 삭제
   * @flow ipron-routepoint-delete
   */
  deleteRoutePoint: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-routepoint-delete', { params });
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

  // ─── Endpoint (국선배정용, cross-feature) ──────────────────────────────────

  /**
   * 국선 목록 조회 (국선배정 Dialog에서 사용)
   * @flow ipron-endpoint-list
   */
  getEndpoints: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ value: { endptId: number; endptName: string; endptType: number; nodeId: number; nodeName: string | null }[] }>>(
      '/ipron-endpoint-list',
      { params },
    );
    return response.data?.data?.value ?? [];
  },

  /**
   * 배정 가능 국선 목록 (로컬 + DR + 리모트 노드, backupGb 포함)
   * @flow ipron-route-assignable-endpoints
   */
  getAssignableEndpoints: async (routeId: number): Promise<RoutePoint[]> => {
    const response = await apiClient.get<ApiResponse<{ value: RoutePoint[] }>>('/ipron-route-assignable-endpoints', { params: { id: routeId } });
    return response.data?.data?.value ?? [];
  },

  // ─── 같은 노드 라우트 목록 (Self-ref FK select용) ────────────────────────────

  /**
   * 동일 노드 라우트 목록 (혼잡라우트/차단라우트/업무시간우회라우트 select 용)
   * route-list에 nodeId 파라미터를 넘겨서 재사용
   */
  getRoutesByNode: async (nodeId: number): Promise<Route[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Route[] }>>('/ipron-route-list', {
      params: { nodeId },
    });
    return response.data?.data?.value ?? [];
  },

  // ─── Combo Options (발신라우트 폼 동적 Select용) ──────────────────────────

  /**
   * DOD 번호변환 콤보 옵션 조회
   * @flow ipron-dodtrans-options
   * SWAT: cbCreate('#poDodTransId','dodtrans','search1='+nodeId)
   * BE: GET /api/ipron/dod-trans-masters?nodeId=X
   */
  getDodTransOptions: async (nodeId: number): Promise<DodTransOption[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DodTransOption[] }>>('/ipron-dodtrans-options', {
      params: { nodeId },
    });
    // dod-trans-masters는 전체 DodTransMasterResponse 반환 — value 배열 또는 data 직접
    const raw = response.data?.data;
    if (Array.isArray(raw)) {
      return (raw as DodTransOption[]).map((item) => ({ dodTransId: item.dodTransId, dodTransName: item.dodTransName }));
    }
    return (raw as { value?: DodTransOption[] })?.value ?? [];
  },

  /**
   * 업무시간 콤보 옵션 조회
   * @flow ipron-route-worktime-options
   * SWAT: cbCreate('#poIeWorktimeId','worktime','nodeId='+nodeId+'&tenantId=0')
   * BE: GET /api/ipron/routes/worktime-options?nodeId=X
   */
  getWorktimeOptions: async (nodeId: number): Promise<WorktimeOption[]> => {
    // BE WorktimeOptionItem = { id, name } — BFF wrapping으로 { value: [{id,name},...] } 도착
    const response = await apiClient.get<ApiResponse<{ value: Array<{ id: number; name: string }> }>>('/ipron-route-worktime-options', {
      params: { nodeId },
      silent: true,
    });
    const raw = response.data?.data;
    const items: Array<{ id: number; name: string }> = Array.isArray(raw) ? raw : ((raw as { value?: Array<{ id: number; name: string }> })?.value ?? []);
    // 호출부(RouteForm.tsx, EndpointForm.tsx)가 worktimeId/worktimeName 사용하므로 여기서 변환
    return items.map((item) => ({ worktimeId: item.id, worktimeName: item.name }));
  },

  /**
   * 안내멘트 콤보 옵션 조회
   * @flow ipron-ment-options (ipron-ment-mgmt seed에 이미 등록됨)
   * SWAT: cbCreate('#poWorktimeMentId','ment','nodeId='+nodeId+'&tenantId=0')
   * BE: GET /api/ipron/ments/options?nodeId=X&tenantId=0
   */
  getMentOptions: async (nodeId: number): Promise<MentOption[]> => {
    const response = await apiClient.get<ApiResponse<MentOption[]>>('/ipron-ment-options', {
      params: { nodeId, tenantId: 0 },
    });
    const raw = response.data?.data;
    if (Array.isArray(raw)) return raw;
    return (raw as { value?: MentOption[] })?.value ?? [];
  },
};

// ─── Combo Option Types ───────────────────────────────────────────────────────

export interface DodTransOption {
  dodTransId: number;
  dodTransName: string;
}

export interface WorktimeOption {
  worktimeId: number;
  worktimeName: string;
}

export interface MentOption {
  id: number;
  name: string;
}
