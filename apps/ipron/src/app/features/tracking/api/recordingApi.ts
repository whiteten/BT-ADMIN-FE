/**
 * 트래킹 녹취 청취 API.
 *
 * BFF Flow:
 *  - ipron-tracking-recording-eligibility (GET) — 청취 가능 + payload
 *  - ipron-tracking-recording-stream      (GET binary) — mp3 byte stream
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface RecordingEligibility {
  eligible: boolean;
  reason: string | null;
  hopType: 'IE_EXT' | 'IR' | null;
  dnno: string | null;
  callid: string | null;
  filename: string | null;
  sttEnabled: boolean;
  /** AOE (대화 요약) 모듈 활성 여부 — TB_BT_CM_APP_MST.APP_ID='aoe' */
  aoeEnabled: boolean;
}

export const recordingApi = {
  eligibility: async (ucid: string, hop: number): Promise<RecordingEligibility | null> => {
    const r = await apiClient.get<ApiResponse<RecordingEligibility>>('/ipron-tracking-recording-eligibility', {
      params: { ucid, hop },
    });
    return r.data?.data ?? null;
  },
  streamUrl: async (ucid: string, hop: number): Promise<{ url: string; cleanup: () => void }> => {
    const r = await apiClient.get<Blob>('/ipron-tracking-recording-stream', {
      params: { ucid, hop },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(r.data);
    return { url, cleanup: () => URL.revokeObjectURL(url) };
  },
};
