/**
 * DID 번호변환 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-dnis-trans-list:     GET    DNIS 번호변환 목록 조회
 * - ipron-dnis-trans-detail:   GET    DNIS 번호변환 상세 조회
 * - ipron-dnis-trans-create:   POST   DNIS 번호변환 등록
 * - ipron-dnis-trans-update:   PUT    DNIS 번호변환 수정
 * - ipron-dnis-trans-delete:   DELETE DNIS 번호변환 삭제
 * - ipron-ani-trans-list:      GET    ANI 번호변환 목록 조회
 * - ipron-ani-trans-detail:    GET    ANI 번호변환 상세 조회
 * - ipron-ani-trans-create:    POST   ANI 번호변환 등록
 * - ipron-ani-trans-update:    PUT    ANI 번호변환 수정
 * - ipron-ani-trans-delete:    DELETE ANI 번호변환 삭제
 * - manager-node-list:         GET    노드 목록 조회 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DidTrans, DidTransCreateRequest, DidTransUpdateRequest, NumPattern, NumPatternCreateRequest, NumPatternUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const didTransApi = {
  // ─── DNIS ──────────────────────────────────────────────────────────────────

  /**
   * DNIS 번호변환 목록 조회
   * @flow ipron-dnis-trans-list
   * Backend: ApiResponse<List<DidTransResponse>> -> BFF: data.value[]
   */
  getDnisTransList: async (params?: Record<string, unknown>): Promise<DidTrans[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DidTrans[] }>>('/ipron-dnis-trans-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * DNIS 번호변환 상세 조회
   * @flow ipron-dnis-trans-detail
   */
  getDnisTransDetail: async (params: Record<string, unknown>): Promise<DidTrans> => {
    const response = await apiClient.get<DetailResponse<DidTrans>>('/ipron-dnis-trans-detail', { params });
    return extractDetail(response);
  },

  /**
   * DNIS 번호변환 등록
   * @flow ipron-dnis-trans-create
   */
  createDnisTrans: async (data: DidTransCreateRequest): Promise<DidTrans> => {
    const response = await apiClient.post<DetailResponse<DidTrans>>('/ipron-dnis-trans-create', data);
    return extractDetail(response);
  },

  /**
   * DNIS 번호변환 수정
   * @flow ipron-dnis-trans-update
   */
  updateDnisTrans: async ({ id, data }: { id: number; data: DidTransUpdateRequest }): Promise<DidTrans> => {
    const response = await apiClient.put<DetailResponse<DidTrans>>('/ipron-dnis-trans-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * DNIS 번호변환 삭제
   * @flow ipron-dnis-trans-delete
   */
  deleteDnisTrans: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-dnis-trans-delete', { params });
  },

  // ─── ANI ───────────────────────────────────────────────────────────────────

  /**
   * ANI 번호변환 목록 조회
   * @flow ipron-ani-trans-list
   */
  getAniTransList: async (params?: Record<string, unknown>): Promise<DidTrans[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DidTrans[] }>>('/ipron-ani-trans-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * ANI 번호변환 상세 조회
   * @flow ipron-ani-trans-detail
   */
  getAniTransDetail: async (params: Record<string, unknown>): Promise<DidTrans> => {
    const response = await apiClient.get<DetailResponse<DidTrans>>('/ipron-ani-trans-detail', { params });
    return extractDetail(response);
  },

  /**
   * ANI 번호변환 등록
   * @flow ipron-ani-trans-create
   */
  createAniTrans: async (data: DidTransCreateRequest): Promise<DidTrans> => {
    const response = await apiClient.post<DetailResponse<DidTrans>>('/ipron-ani-trans-create', data);
    return extractDetail(response);
  },

  /**
   * ANI 번호변환 수정
   * @flow ipron-ani-trans-update
   */
  updateAniTrans: async ({ id, data }: { id: number; data: DidTransUpdateRequest }): Promise<DidTrans> => {
    const response = await apiClient.put<DetailResponse<DidTrans>>('/ipron-ani-trans-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * ANI 번호변환 삭제
   * @flow ipron-ani-trans-delete
   */
  deleteAniTrans: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-ani-trans-delete', { params });
  },

  // ─── 노드간 복사 ──────────────────────────────────────────────────────────

  copyDnisTrans: async (data: { sourceNodeId: number; targetNodeId: number }): Promise<number> => {
    const response = await apiClient.post<DetailResponse<{ value: number }>>('/ipron-dnis-trans-copy', data);
    return extractDetail(response)?.value ?? 0;
  },

  copyAniTrans: async (data: { sourceNodeId: number; targetNodeId: number }): Promise<number> => {
    const response = await apiClient.post<DetailResponse<{ value: number }>>('/ipron-ani-trans-copy', data);
    return extractDetail(response)?.value ?? 0;
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

  // ─── 번호 패턴 ────────────────────────────────────────────────────────────

  /**
   * 번호 패턴 목록 조회
   * @flow ipron-num-pattern-list
   * Backend: ApiResponse<List<NumPatternResponse>> -> BFF: data.value[]
   */
  getNumPatterns: async (): Promise<NumPattern[]> => {
    const response = await apiClient.get<DetailResponse<{ value: NumPattern[] }>>('/ipron-num-pattern-list');
    return extractDetail(response)?.value ?? [];
  },

  /**
   * 번호 패턴 등록
   * @flow ipron-num-pattern-create
   */
  createNumPattern: async (data: NumPatternCreateRequest): Promise<NumPattern> => {
    const response = await apiClient.post<DetailResponse<NumPattern>>('/ipron-num-pattern-create', data);
    return extractDetail(response);
  },

  /**
   * 번호 패턴 수정
   * @flow ipron-num-pattern-update
   */
  updateNumPattern: async ({ id, data }: { id: number; data: NumPatternUpdateRequest }): Promise<NumPattern> => {
    const response = await apiClient.put<DetailResponse<NumPattern>>('/ipron-num-pattern-update', data, {
      params: { id },
    });
    return extractDetail(response);
  },

  /**
   * 번호 패턴 삭제
   * @flow ipron-num-pattern-delete
   */
  deleteNumPattern: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ipron-num-pattern-delete', { params });
  },
};
