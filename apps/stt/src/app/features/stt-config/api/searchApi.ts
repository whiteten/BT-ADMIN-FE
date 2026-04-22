import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type {
  SttResultSentenceItem,
  SttResultSentenceParams,
  SttSearchCallbotDetailItem,
  SttSearchCallbotDetailParams,
  SttSearchCallbotItem,
  SttSearchCallbotParams,
  SttSearchItem,
  SttSearchParams,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const searchApi = {
  getSttSearch: async (params?: SttSearchParams) => {
    const response = await apiClient.post<ListResponse<SttSearchItem>>('/stt-search-list', params);
    return extractList(response);
  },
  getSttSearchCallbot: async (params?: SttSearchCallbotParams) => {
    const response = await apiClient.post<ListResponse<SttSearchCallbotItem>>('/stt-search-callbot-list', params);
    return extractList(response);
  },
  getSttSearchCallbotDetail: async (params?: SttSearchCallbotDetailParams) => {
    const response = await apiClient.post<ListResponse<SttSearchCallbotDetailItem>>('/stt-search-callbot-detail', params);
    return extractList(response);
  },
  getSttResultSentence: async (params: SttResultSentenceParams) => {
    const response = await apiClient.get<ListResponse<SttResultSentenceItem>>('/stt-search-result-sentence', { params });
    return extractList(response);
  },
};
