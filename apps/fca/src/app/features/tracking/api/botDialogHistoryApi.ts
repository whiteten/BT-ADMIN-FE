import type { AxiosRequestConfig } from 'axios';
import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { BotServiceDto, IntentDto, PagedBotDialogHistory, SlotSankeyItem } from '../types/botDialogHistory.types';
import type { NluAnalysisItem, RetrainLogItem, TrackingFlowItem } from '../types/tracking.types';

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

/** 대화이력 기능 설정 */
export interface DialogHistoryConfig {
  mediaPlayerEnabled: boolean;
}

export const botDialogHistoryApi = {
  /** 대화이력 기능 설정 조회 */
  getConfig: async (): Promise<DialogHistoryConfig> => {
    const response = await apiClient.get<{ data: DialogHistoryConfig }>('/bot-dialog-history-config');
    return response.data?.data ?? { mediaPlayerEnabled: false };
  },
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
  /** 녹취 오디오 Blob 조회. 녹취 파일이 없으면(404 등) null 반환 (에러 토스트 미표시). */
  getAudioBlob: async (params: { ucid: string; nextHop: number; cdrPkey: number }): Promise<Blob | null> => {
    try {
      const response = await apiClient.get<Blob>('/bot-dialog-history-audio', {
        params,
        responseType: 'blob',
        skipGlobalHandler: true,
      } as AxiosRequestConfig & { skipGlobalHandler: boolean });
      return response.data as unknown as Blob;
    } catch {
      return null;
    }
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/bot-dialog-history-export', params, { responseType: 'blob' });
  },
  /** 슬롯 Sankey 차트 데이터 조회 */
  getSlotSankey: async (data: Record<string, unknown>): Promise<SlotSankeyItem[]> => {
    const response = await apiClient.post<ListResponse<SlotSankeyItem>>('/bot-dialog-history-slot-sankey', data);
    return extractList(response);
  },
  /** 재학습 변경 이력 조회 */
  getRetrainLogs: async (params: { ucidGkey: string; questionSeq: number; hop: number }): Promise<RetrainLogItem[]> => {
    const response = await apiClient.get<ListResponse<RetrainLogItem>>('/bot-dialog-history-retrain-logs', { params });
    return extractList(response);
  },
};
