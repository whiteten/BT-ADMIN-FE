import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { BotServiceDto, IntentDto, PagedBotDialogHistory } from '../types/botDialogHistory.types';
import type { NluAnalysisItem, TrackingFlowItem } from '../types/tracking.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/** 복호화 응답 단건 ({@link botDialogHistoryApi.decryptBubbles} 참조) */
export interface DecryptedBubbleDto {
  /** 대상 bubbleKey — 응답 매핑 키로 사용 */
  bubbleKey: string;
  /** 복호화된 평문 */
  description: string;
}

/** 복호화 요청 파라미터 */
export interface DecryptBubblesArgs {
  params: { ucid: string };
  data: {
    bubbleKeys: string[];
    /** 서버 REASON_CODE (프리셋: MINWON/QUALITY/SECURITY/LEGAL/CUSTOMER/CUSTOM) */
    reasonCode?: string;
    /** 서버 REASON_TEXT (프리셋 라벨 또는 자유 입력) */
    reasonText?: string;
  };
}

export const botDialogHistoryApi = {
  getBotServices: async (params?: Record<string, unknown>): Promise<BotServiceDto[]> => {
    const response = await apiClient.get<ListResponse<BotServiceDto>>('/bot-services', { params });
    return extractList(response);
  },
  getBotDialogHistory: async (params?: Record<string, unknown>): Promise<PagedBotDialogHistory> => {
    const { _t, ...body } = params ?? {};
    const response = await apiClient.post<{ data: PagedBotDialogHistory }>('/bot-dialog-history-list', body);
    return response.data?.data ?? { items: [], page: 0, size: 0, total: 0 };
  },
  getIntents: async (params?: Record<string, unknown>): Promise<IntentDto[]> => {
    const response = await apiClient.get<ListResponse<IntentDto>>('/bot-dialog-history-intents', { params });
    return extractList(response);
  },
  getBubbles: async (params?: Record<string, unknown>): Promise<TrackingFlowItem[]> => {
    const response = await apiClient.get<ListResponse<TrackingFlowItem>>('/bot-dialog-history-bubbles', { params });
    return extractList(response);
  },
  getNluAnalysis: async (params?: Record<string, unknown>): Promise<NluAnalysisItem[]> => {
    const response = await apiClient.get<ListResponse<NluAnalysisItem>>('/bot-dialog-history-nlu-analysis', { params });
    return extractList(response);
  },
  /**
   * 암호화 버블 on-demand 복호화.
   * 사용자가 🔒 버블을 클릭할 때 사유를 받아 호출하며, 서버 측에서 매 요청이 감사 로그로 기록됩니다.
   */
  decryptBubbles: async ({ params, data }: DecryptBubblesArgs): Promise<DecryptedBubbleDto[]> => {
    const response = await apiClient.post<ListResponse<DecryptedBubbleDto>>('/bot-dialog-history-bubble-decrypt', data, { params });
    return extractList(response);
  },
  getIfeRedirectUrl: async (params: { serviceId: number; serviceVer: string; subFlowId: string; nodeName: string }): Promise<string | null> => {
    const response = await apiClient.get<{ data: { redirectUrl: string } }>('/bot-dialog-history-ife-redirect', { params });
    return response.data?.data?.redirectUrl ?? '';
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/bot-dialog-history-export', params, { responseType: 'blob' });
  },
};
