import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ExcelImportResult,
  KeywordBoostingCreateData,
  KeywordBoostingItem,
  KeywordBoostingSearchParams,
  SttDictionaryCreateData,
  SttDictionaryItem,
  SttDictionarySearchParams,
  SttDictionaryUpdateData,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dictionaryApi = {
  getKeywordBoostingList: async (params?: KeywordBoostingSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: KeywordBoostingItem[] }>>('/keyword-boosting-list', { params });
    return response.data?.data?.items ?? [];
  },
  createKeywordBoosting: async (data: KeywordBoostingCreateData) => {
    return apiClient.post('/keyword-boosting-create', data);
  },
  deleteKeywordBoosting: async (params: { engineCode: string; keyword: string }) => {
    await apiClient.delete(`/keyword-boosting-delete`, { params });
  },
  getSttDictionaryList: async (params?: SttDictionarySearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttDictionaryItem[] }>>('/stt-dictionary-list', { params });
    return response.data?.data?.items ?? [];
  },
  createSttDictionary: async (data: SttDictionaryCreateData) => {
    return apiClient.post('/stt-dictionary-create', data);
  },
  updateSttDictionary: async (data: SttDictionaryUpdateData) => {
    return apiClient.put('/stt-dictionary-update', data);
  },
  deleteSttDictionary: async (params: { beforeWord: string }) => {
    await apiClient.delete('/stt-dictionary-delete', { params });
  },
  importSttDictionary: async (data: File): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/stt-dictionary-excel-import', formData);
    return response.data?.data;
  },
  importKeywordBoosting: async ({ engineCode, data }: { engineCode: string; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/keyword-boosting-excel-import', formData, { params: { engineCode } });
    return response.data?.data;
  },
};
