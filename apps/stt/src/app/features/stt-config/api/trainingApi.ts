import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ConfidenceTrainingItem,
  ConfidenceTrainingSearchParams,
  TuningSentenceCreateDatas,
  TuningSentenceItem,
  TuningSentenceSearchParams,
  TuningSentenceUpdateDatas,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const trainingApi = {
  getTrainingList: async (params?: ConfidenceTrainingSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: ConfidenceTrainingItem[] }>>('/confidence-training-list', { params });
    return response.data?.data?.items ?? [];
  },
  createTuningSentence: async (data: TuningSentenceCreateDatas) => {
    const response = await apiClient.post('/tuning-sentence-create', data);
    return response;
  },
  getTuningSentenceList: async (params?: TuningSentenceSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: TuningSentenceItem[] }>>('/tuning-sentence-list', { params });
    return response.data?.data?.items ?? [];
  },
  deleteTuningSentence: async (params: { ucidGkey: string; armsoffset: number; rxtxKind: string }) => {
    await apiClient.delete('/tuning-sentence-delete', { params });
  },
  updateTunningKind: async (data: { tunningKind: string; ucidGkey: string; armsoffset: number; rxtxKind: string }) => {
    await apiClient.put('/tuning-kind-update', data);
  },
  updateTuningSentence: async (data: TuningSentenceUpdateDatas) => {
    await apiClient.put('/tuning-sentence-update', data);
  },
};
