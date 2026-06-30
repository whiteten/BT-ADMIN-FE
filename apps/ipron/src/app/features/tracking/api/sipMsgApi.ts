/**
 * SIP 메시지 raw 조회 API — AS-IS sipMsgTracer 미러.
 *
 * BE: GET /api/ipron/sip-msg?file=&position=&length=&segmentType=&systemId=&callDate=
 * BFF Flow: ipron-sip-msg-fetch
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface SipMsgResponse {
  file: string;
  position: number;
  length: number;
  segmentType: string;
  systemId: number | null;
  callDate: string;
  body: string;
  byteSize: number;
}

export interface SipMsgFetchParams {
  file: string;
  position: number;
  length: number;
  segmentType: 'IE' | 'IC' | 'IR' | string;
  systemId: number | null | undefined;
  callDate?: string | null;
}

export const sipMsgApi = {
  fetch: async (p: SipMsgFetchParams): Promise<SipMsgResponse> => {
    const response = await apiClient.get<ApiResponse<SipMsgResponse>>('/ipron-sip-msg-fetch', {
      params: {
        file: p.file,
        position: p.position,
        length: p.length,
        segmentType: p.segmentType,
        ...(p.systemId != null ? { systemId: p.systemId } : {}),
        ...(p.callDate ? { callDate: p.callDate } : {}),
      },
    });
    const data = response.data?.data;
    if (!data) throw new Error('SIP_MSG_EMPTY');
    return data;
  },
};

/**
 * AS-IS onclick="Detail('file', position, length)" 문자열 파싱.
 * 잘못된 형식이면 null.
 */
export function parseDetailCall(s: string | undefined | null): { file: string; position: number; length: number } | null {
  if (!s) return null;
  const m = /Detail\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i.exec(s);
  if (!m) return null;
  return { file: m[1], position: Number(m[2]), length: Number(m[3]) };
}
