import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  RecogAccuracyResult,
  RecogGroupCreateData,
  RecogGroupDetail,
  RecogGroupItem,
  RecogGroupUpdateData,
  RecogTargetCreateData,
  RecogTargetListItem,
  RecogTargetSearchItem,
  RecogTargetSearchParams,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const recogApi = {
  getRecogGroupList: async (params?: { engineCode?: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: RecogGroupItem[] }>>('/recog-group-list', { params });
    return response.data?.data?.items ?? [];
  },
  createRecogGroup: async (data: RecogGroupCreateData) => {
    return apiClient.post('/recog-group-create', data);
  },
  updateRecogGroup: async (data: RecogGroupUpdateData) => {
    return apiClient.put('/recog-group-update', { groupName: data.groupName }, { params: { groupCode: data.groupCode } });
  },
  deleteRecogGroup: async (groupCode: string) => {
    await apiClient.delete('/recog-group-delete', { params: { groupCode } });
  },
  getRecogGroupDetail: async (groupCode: string) => {
    return apiClient.post<RecogGroupDetail>('/recog-group-detail', { groupCode });
  },
  getRecogTargetSearch: async (params?: RecogTargetSearchParams) => {
    const response = await apiClient.post<ApiResponse<{ items: RecogTargetSearchItem[] }>>('/recog-target-search', params);
    return response.data?.data?.items ?? [];
  },
  createRecogTarget: async (data: RecogTargetCreateData) => {
    return apiClient.post('/recog-target-create', data);
  },
  getRecogTargetList: async (params: { groupCode: string; engineCode?: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: RecogTargetListItem[] }>>('/recog-target-list', { params });
    return response.data?.data?.items ?? [];
  },
  deleteRecogTarget: async (params: { ucidGkey: string; armsoffset: number; rxtxKind: string }) => {
    await apiClient.delete('/recog-target-delete', { params });
  },
  deleteRecogTargets: async (ids: number[]) => {
    return apiClient.post('/recog-target-delete-bulk', { ids });
  },
};
