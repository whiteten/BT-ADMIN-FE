import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { ConfidenceTrainingCreateDatas, ConfidenceTrainingItem, ConfidenceTrainingSearchParams, TuningSentenceItem, TuningSentenceSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const trainingApi = {
  getTrainingList: async (params?: ConfidenceTrainingSearchParams) => {
    const response = await apiClient.post<ListResponse<ConfidenceTrainingItem>>('/confidence-training-list', params);
    return extractList(response);
  },
  createConfidenceTraining: async (data: ConfidenceTrainingCreateDatas) => {
    const response = await apiClient.post('/confidence-training-create', data);
    return response;
  },
  getTuningSentenceList: async (params?: TuningSentenceSearchParams) => {
    const response = await apiClient.post<ListResponse<TuningSentenceItem>>('/tuning-sentence-list', params);
    return extractList(response);
  },
  deleteTuningSentence: async (id: number) => {
    await apiClient.delete('/tuning-sentence-delete', { params: { id } });
  },
};
