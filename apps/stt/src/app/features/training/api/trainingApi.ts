import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { TrainingItem, TrainingRegisterDatas, TrainingSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const trainingApi = {
  getTrainingList: async (params?: TrainingSearchParams) => {
    const response = await apiClient.post<ListResponse<TrainingItem>>('/training-list', params);
    return extractList(response);
  },
  registerTraining: async (data: TrainingRegisterDatas) => {
    const response = await apiClient.post('/training-register', data);
    return response;
  },
};
