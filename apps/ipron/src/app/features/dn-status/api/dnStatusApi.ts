/**
 * 교환기 번호자원 현황 (dn-status) API 클라이언트 — BFF Aggregation Flow 기반.
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST, seed.sql 확정·스모크 PASS):
 * - ipron-dn-status-nodes:        GET    노드별 DN타입 할당 집계 ({common,nodes})
 * - ipron-dn-status-dr:           GET    DR 링크 집계
 * - ipron-dn-status-dr-dns:       GET    DR 백업 DN 목록 (필수 param fromNodeId,toNodeId)
 * - ipron-dn-status-gdns:         GET    GDN타입별 집계
 * - ipron-dn-status-bands:        GET    노드별 번호 대역 현황 (필수 param nodeId)
 * - ipron-dn-status-band-create:  POST   번호 대역 등록
 * - ipron-dn-status-band-delete:  DELETE 번호 대역 삭제 (🔴 BFF 는 ?id={bandId} query param)
 *
 * DN 목록 드릴다운은 기존 ipron-dn-list (DnController) 재사용 — 본 API 는 집계 전용.
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DnBandCreateRequest, DnBandResponse, DnBandStatus, DnStatusOverview, DrDn, DrLink, GdnTypeStat } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnStatusApi = {
  /**
   * 노드×DN타입×할당 집계 ({common,nodes} 래퍼)
   * @flow ipron-dn-status-nodes
   */
  getNodes: async (): Promise<DnStatusOverview> => {
    const response = await apiClient.get<ApiResponse<DnStatusOverview>>('/ipron-dn-status-nodes');
    return response.data?.data ?? { common: { adnTotal: 0, adnAssigned: 0, globalDnTotal: 0, extraTypes: [] }, nodes: [] };
  },

  /**
   * DR 수용 방향성 링크 집계
   * @flow ipron-dn-status-dr
   */
  getDrLinks: async (): Promise<DrLink[]> => {
    const response = await apiClient.get<ApiResponse<DrLink[]>>('/ipron-dn-status-dr');
    return response.data?.data ?? [];
  },

  /**
   * DR 백업 DN 상세 목록 (링크 드릴다운)
   * @flow ipron-dn-status-dr-dns
   */
  getDrDns: async (params: { fromNodeId: number; toNodeId: number }): Promise<DrDn[]> => {
    const response = await apiClient.get<ApiResponse<DrDn[]>>('/ipron-dn-status-dr-dns', { params });
    return response.data?.data ?? [];
  },

  /**
   * 노드×GDN타입 집계 (16=ACD/17=CTI큐/18=SIP트렁크) — 건수만
   * @flow ipron-dn-status-gdns
   */
  getGdnStats: async (): Promise<GdnTypeStat[]> => {
    const response = await apiClient.get<ApiResponse<GdnTypeStat[]>>('/ipron-dn-status-gdns');
    return response.data?.data ?? [];
  },

  /**
   * 노드별 번호 대역 현황 (선언 대역 + 연속 구간)
   * @flow ipron-dn-status-bands
   */
  getBands: async (params: { nodeId: number }): Promise<DnBandStatus> => {
    const response = await apiClient.get<ApiResponse<DnBandStatus>>('/ipron-dn-status-bands', { params });
    return response.data?.data ?? { nodeId: params.nodeId, bands: [], unbandedUsedCount: 0 };
  },

  /**
   * 번호 대역 등록 (노드 내 겹침 불가)
   * @flow ipron-dn-status-band-create
   */
  createBand: async (data: DnBandCreateRequest): Promise<DnBandResponse> => {
    const response = await apiClient.post<ApiResponse<DnBandResponse>>('/ipron-dn-status-band-create', data);
    return response.data?.data;
  },

  /**
   * 번호 대역 삭제
   * @flow ipron-dn-status-band-delete
   * 🔴 BFF flow 는 path segment {id} 대신 query param ?id={bandId} 로 호출 (PLAN-FE §5.1)
   */
  deleteBand: async ({ bandId }: { bandId: number }) => {
    return await apiClient.delete('/ipron-dn-status-band-delete', { params: { id: bandId } });
  },
};
