import ApiClient, { type ApiResponse } from '@/shared-util';
import type { FaultForceRecoverParams, FaultHistoryItem, FaultHistoryListParams, FaultHistorySummary, ForceRecoverResult, PagedResponse } from '../types';

/**
 * 장애 이력 API 클라이언트 — BFF Flow 경유
 * (V135: manager-fault-history-list / summary / events / memo-update)
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const faultHistoryApi = {
  /** 목록 조회 (서버 페이징 + 필터) */
  getList: async (params: FaultHistoryListParams): Promise<PagedResponse<FaultHistoryItem>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<FaultHistoryItem>>>('/manager-fault-history-list', { params });
    return response.data.data;
  },

  /** 요약 스탯 — 조회 기간(from~to yyyyMMdd, 기본 오늘) 발생 / 미복구 / 미복구 Critical */
  getSummary: async (params?: { from?: string; to?: string }): Promise<FaultHistorySummary> => {
    const response = await apiClient.get<ApiResponse<FaultHistorySummary>>('/manager-fault-history-summary', { params: params ?? {} });
    return response.data.data;
  },

  /** 같은 장애 Key(issueKey)의 이벤트 시퀀스 — 배열 응답은 BFF 가 { value: [...] } 로 감싼다 (BFF-AGGREGATION-RESPONSE-SPEC) */
  getEvents: async (issueKey: string): Promise<FaultHistoryItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: FaultHistoryItem[] }>>('/manager-fault-history-events', { params: { issueKey } });
    return response.data.data?.value ?? [];
  },

  /** 장애 메모 저장 */
  updateMemo: async (historyId: number, memo: string): Promise<void> => {
    await apiClient.put('/manager-fault-history-memo-update', { memo }, { params: { historyId } });
  },

  /** 일괄 강제복구 — 엔진(IOSVR) 지시 성공 건만 복구 마킹, 건별 결과 반환 */
  forceRecover: async (params: FaultForceRecoverParams): Promise<ForceRecoverResult> => {
    const response = await apiClient.post<ApiResponse<ForceRecoverResult>>('/manager-fault-history-recover', params);
    return response.data.data;
  },
};
