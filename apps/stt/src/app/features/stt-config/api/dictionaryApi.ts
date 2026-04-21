import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { KeywordBoostingCreateData, KeywordBoostingItem, KeywordBoostingSearchParams, SttDictionaryCreateData, SttDictionaryItem, SttDictionarySearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dictionaryApi = {
  getKeywordBoostingList: async (params?: KeywordBoostingSearchParams) => {
    const response = await apiClient.get<ListResponse<KeywordBoostingItem>>('/keyword-boosting-list', { params });
    return extractList(response);
  },
  createKeywordBoosting: async (data: KeywordBoostingCreateData) => {
    return apiClient.post('/keyword-boosting-create', data);
  },
  deleteKeywordBoosting: async (params: { engineCode: string; keyword: string }) => {
    await apiClient.delete(`/keyword-boosting-delete`, { params });
  },
  getSttDictionaryList: async (params?: SttDictionarySearchParams) => {
    const response = await apiClient.get<ListResponse<SttDictionaryItem>>('/stt-dictionary-list', { params });
    return extractList(response);
  },
  createSttDictionary: async (data: SttDictionaryCreateData) => {
    return apiClient.post('/stt-dictionary-create', data);
  },
  deleteSttDictionary: async (params: { beforeWord: string }) => {
    await apiClient.delete('/stt-dictionary-delete', { params });
  },
};
