/**
 * SIP 로그 조회 API.
 *
 * BE: GET /api/ipron/sip-log?ucid=&segmentType=IE|IC|IR&systemId=&callDate=
 * BFF Flow: ipron-sip-log-fetch
 *
 * 캐시 없음 — 매번 실시간 IR/IE/IC 장비 호출 (AS-IS IPR30S1010Service.sipLogTracer 와 동일).
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface SipLogResponse {
  ucid: string;
  segmentType: string;
  systemId: number | null;
  callDate: string;
  body: string;
  byteSize: number;
}

export interface SipLogFetchParams {
  ucid: string;
  segmentType: 'IE' | 'IC' | 'IR' | string;
  systemId: number | null | undefined;
  callDate?: string | null;
}

export const sipLogApi = {
  fetch: async (p: SipLogFetchParams): Promise<SipLogResponse> => {
    const response = await apiClient.get<ApiResponse<SipLogResponse>>('/ipron-sip-log-fetch', {
      params: {
        ucid: p.ucid,
        segmentType: p.segmentType,
        ...(p.systemId != null ? { systemId: p.systemId } : {}),
        ...(p.callDate ? { callDate: p.callDate } : {}),
      },
    });
    const data = response.data?.data;
    if (!data) throw new Error('SIP_LOG_EMPTY');
    return data;
  },
};
