import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type {
  RecogAccuracyResult,
  RecogGroupCreateData,
  RecogGroupDetail,
  RecogGroupItem,
  RecogGroupUpdateData,
  RecogTargetAddData,
  RecogTargetListItem,
  RecogTargetSearchItem,
  RecogTargetSearchParams,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const recogApi = {
  getRecogGroupList: async () => {
    const response = await apiClient.get<ListResponse<RecogGroupItem>>('/recog-group-list');
    return extractList(response);
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
    const response = await apiClient.post<ListResponse<RecogTargetSearchItem>>('/recog-target-search', params);
    return extractList(response);
  },
  addRecogTarget: async (data: RecogTargetAddData) => {
    return apiClient.post('/recog-target-add', data);
  },
  getRecogTargetList: async (params: { groupCode: string; engineCode?: string }) => {
    const response = await apiClient.get<ListResponse<RecogTargetListItem>>('/recog-target-list', { params });
    return extractList(response);
  },
  deleteRecogTarget: async (id: number) => {
    await apiClient.delete('/recog-target-delete', { params: { id } });
  },
  deleteRecogTargets: async (ids: number[]) => {
    return apiClient.post('/recog-target-delete-bulk', { ids });
  },
  measureRecogAccuracy: async (groupCode: string) => {
    return apiClient.post<RecogAccuracyResult>('/recog-accuracy-measure', { groupCode });
  },
};
