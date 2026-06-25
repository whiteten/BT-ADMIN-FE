/**
 * IR 서비스 로그 조회 API.
 *
 * BE: GET /api/ipron/ir-service-log + /meta
 * BFF Flow: ipron-ir-svc-log-fetch / ipron-ir-svc-log-meta
 *
 * - 캐시 hit → DB 메타 + 로컬 파일 read 결과 응답 (빠름)
 * - 캐시 miss → IR 장비 TCP 호출 + 파일 저장 + IOSVR sync + 메타 INSERT
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface IrServiceLogResponse {
  ucid: string;
  nextHop: string; // 4자 0-패딩
  callDate: string; // YYYYMMDD
  systemId: number | null;
  sleeId: number | null;
  target: string | null;
  version: string | null;
  originalSize: number | null;
  compressedSize: number | null;
  contentEncoding: string | null;
  cachedAt: string | null;
  expireAt: string | null;
  cacheHit: boolean;
  body: string;
}

export interface IrServiceLogMetaResponse {
  ucid: string;
  nextHop: string;
  exists: boolean;
  compressedSize: number | null;
  originalSize: number | null;
  cachedAt: string | null;
  expireAt: string | null;
}

export interface IrServiceLogFetchParams {
  ucid: string;
  hop: number;
  systemId?: number | null;
  sleeId?: number | null;
  callDate?: string | null; // YYYYMMDD
}

export const irServiceLogApi = {
  fetch: async (params: IrServiceLogFetchParams): Promise<IrServiceLogResponse> => {
    const response = await apiClient.get<ApiResponse<IrServiceLogResponse>>('/ipron-ir-svc-log-fetch', {
      params: {
        ucid: params.ucid,
        hop: params.hop,
        ...(params.systemId != null ? { systemId: params.systemId } : {}),
        ...(params.sleeId != null ? { sleeId: params.sleeId } : {}),
        ...(params.callDate ? { callDate: params.callDate } : {}),
      },
    });
    const data = response.data?.data;
    if (!data) throw new Error('IR_SVC_LOG_EMPTY');
    return data;
  },

  meta: async (ucid: string, hop: number): Promise<IrServiceLogMetaResponse> => {
    const response = await apiClient.get<ApiResponse<IrServiceLogMetaResponse>>('/ipron-ir-svc-log-meta', {
      params: { ucid, hop },
    });
    const data = response.data?.data;
    if (!data) throw new Error('IR_SVC_LOG_META_EMPTY');
    return data;
  },
};
