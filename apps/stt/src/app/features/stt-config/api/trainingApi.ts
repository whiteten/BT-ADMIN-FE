import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { ConfidenceTrainingItem, ConfidenceTrainingSearchParams, TuningSentenceCreateDatas, TuningSentenceItem, TuningSentenceSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const trainingApi = {
  getTrainingList: async (params?: ConfidenceTrainingSearchParams) => {
    const response = await apiClient.post<ListResponse<ConfidenceTrainingItem>>('/confidence-training-list', params);
    return extractList(response);
  },
  useCreateTuningSentence: async (data: TuningSentenceCreateDatas) => {
    const response = await apiClient.post('/tuning-sentence-create', data);
    return response;
  },
  getTuningSentenceList: async (params?: TuningSentenceSearchParams) => {
    const response = await apiClient.get<ListResponse<TuningSentenceItem>>('/tuning-sentence-list', { params });
    return extractList(response);
  },
  deleteTuningSentence: async (params: { ucidGkey: string; armsoffset: number; rxtxKind: string }) => {
    await apiClient.delete('/tuning-sentence-delete', { params });
  },
};
