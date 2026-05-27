/**
 * IVR 미디어 관리 API 클라이언트 (IPR20S6041)
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 *  - ivr-mediaserver-get:     GET    Media Server 시스템별 조회
 *  - ivr-mediaserver-upsert:  PUT    Media Server UPSERT (BODY_FROM=request)
 *  - ivr-mediaserver-delete:  DELETE Media Server 삭제
 *  - ivr-tts-list:            GET    TTS Master 목록
 *  - ivr-tts-detail:          GET    TTS Master 상세
 *  - ivr-tts-create:          POST   TTS Master 등록 (BODY_FROM=request)
 *  - ivr-tts-update:          PUT    TTS Master 수정 (BODY_FROM=request)
 *  - ivr-tts-delete:          DELETE TTS Master 삭제
 *  - ivr-stt-list:            GET    STT Master 목록
 *  - ivr-stt-detail:          GET    STT Master 상세
 *  - ivr-stt-create:          POST   STT Master 등록 (BODY_FROM=request)
 *  - ivr-stt-update:          PUT    STT Master 수정 (BODY_FROM=request)
 *  - ivr-stt-delete:          DELETE STT Master 삭제
 *
 * 시스템 목록은 IPR20S6012의 `ivr-dngroup-system-usage` Flow 재사용 (별도 신규 Flow 미생성).
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  IrMediaServer,
  IrMediaServerUpsertRequest,
  IrSttMaster,
  IrSttMasterCreateRequest,
  IrSttMasterUpdateRequest,
  IrSystemUsage,
  IrTtsMaster,
  IrTtsMasterCreateRequest,
  IrTtsMasterUpdateRequest,
} from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const ivrMediaApi = {
  // ─── Media Server (시스템 1:1) ──────────────────────────────────────────

  getMediaServer: async (params: Record<string, unknown>): Promise<IrMediaServer | null> => {
    const response = await apiClient.get<ApiResponse<IrMediaServer>>('/ivr-mediaserver-get', { params });
    // 시스템별 1건 — 미등록 시 백엔드가 null 또는 빈 객체 반환할 수 있음
    const detail = response.data?.data;
    if (!detail || (detail as IrMediaServer).systemId === undefined) return null;
    return detail;
  },

  upsertMediaServer: async ({ id, data }: { id: number; data: IrMediaServerUpsertRequest }): Promise<IrMediaServer> => {
    const response = await apiClient.put<ApiResponse<IrMediaServer>>('/ivr-mediaserver-upsert', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteMediaServer: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-mediaserver-delete', { params });
  },

  // ─── TTS Master ─────────────────────────────────────────────────────────

  getTtsMasters: async (): Promise<IrTtsMaster[]> => {
    const response = await apiClient.get<ApiResponse<{ value: IrTtsMaster[] }>>('/ivr-tts-list');
    return response.data?.data?.value ?? [];
  },

  getTts: async (params: Record<string, unknown>): Promise<IrTtsMaster> => {
    const response = await apiClient.get<ApiResponse<IrTtsMaster>>('/ivr-tts-detail', { params });
    return response.data?.data;
  },

  createTts: async (data: IrTtsMasterCreateRequest): Promise<IrTtsMaster> => {
    const response = await apiClient.post<ApiResponse<IrTtsMaster>>('/ivr-tts-create', data);
    return response.data?.data;
  },

  updateTts: async ({ id, data }: { id: number; data: IrTtsMasterUpdateRequest }): Promise<IrTtsMaster> => {
    const response = await apiClient.put<ApiResponse<IrTtsMaster>>('/ivr-tts-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteTts: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-tts-delete', { params });
  },

  // ─── STT Master ─────────────────────────────────────────────────────────

  getSttMasters: async (): Promise<IrSttMaster[]> => {
    const response = await apiClient.get<ApiResponse<{ value: IrSttMaster[] }>>('/ivr-stt-list');
    return response.data?.data?.value ?? [];
  },

  getStt: async (params: Record<string, unknown>): Promise<IrSttMaster> => {
    const response = await apiClient.get<ApiResponse<IrSttMaster>>('/ivr-stt-detail', { params });
    return response.data?.data;
  },

  createStt: async (data: IrSttMasterCreateRequest): Promise<IrSttMaster> => {
    const response = await apiClient.post<ApiResponse<IrSttMaster>>('/ivr-stt-create', data);
    return response.data?.data;
  },

  updateStt: async ({ id, data }: { id: number; data: IrSttMasterUpdateRequest }): Promise<IrSttMaster> => {
    const response = await apiClient.put<ApiResponse<IrSttMaster>>('/ivr-stt-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteStt: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-stt-delete', { params });
  },

  // ─── 시스템 / 노드 ────────────────────────────────────────────────────

  /**
   * 노드별 ForCus 시스템 목록 (SYS_CLASS_CD 1035/1036/1037).
   * nodeId 미지정 시 모든 노드의 ForCus 시스템 반환 ("전체" 탭 지원).
   */
  getForcusSystems: async (params: Record<string, unknown>): Promise<IrSystemUsage[]> => {
    const response = await apiClient.get<ApiResponse<{ value: IrSystemUsage[] }>>('/ivr-system-list', { params });
    return response.data?.data?.value ?? [];
  },

  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },
};
