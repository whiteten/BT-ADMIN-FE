import ApiClient, { type ApiResponse } from '@/shared-util';
import { type RollingGroup, type TaskboardBg, type TaskboardLayout, type TaskboardNotice } from '../types/taskboard.types';

/**
 * BFF Aggregation Flow를 통한 taskboard API 클라이언트.
 * 모든 API는 반드시 BFF를 통해서만 호출.
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const taskboardApi = {
  // ── 배경 API ─────────────────────────────────────────────────────────────

  getTaskBoardBgs: async (params?: Record<string, unknown>): Promise<TaskboardBg[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardBg[] }>>('/taskboard-bglist', { params });
    return response.data?.data?.items ?? [];
  },

  createTaskBoardBg: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<TaskboardBg> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    if (params?.data) {
      formData.append('data', String(params.data));
    }
    const response = await apiClient.post<ApiResponse<TaskboardBg>>('/taskboard-bginsert', formData);
    return response.data?.data;
  },

  deleteTaskBoardBg: async (pageId: number) => {
    const response = await apiClient.delete('/taskboard-bgdelete', { params: { bgId: pageId } });
    return response;
  },

  // ── 레이아웃 API ──────────────────────────────────────────────────────────

  getLayoutList: async (): Promise<TaskboardLayout[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardLayout[] }>>('/taskboard-layoutlist');
    return response.data?.data?.items ?? [];
  },

  createLayout: async (payload: { pageId: number; tenantId: string; layoutName: string; layoutJson: string; authorName?: string; authRole?: string }): Promise<number> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-layoutinsert', formData);
    return response.data?.data ?? 0;
  },

  updateLayout: async ({ layoutId, layoutName, layoutJson }: { layoutId: number; layoutName: string; layoutJson: string }) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ layoutId, layoutName, layoutJson }));
    const response = await apiClient.post('/taskboard-layoutupdate', formData, { params: { layoutId } });
    return response;
  },

  deleteLayout: async (layoutId: number) => {
    const response = await apiClient.delete('/taskboard-layoutdelete', { params: { layoutId } });
    return response;
  },

  // ── 롤링 그룹 API ────────────────────────────────────────────────────────

  getRollingGroupList: async (): Promise<RollingGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ items: RollingGroup[] }>>('/taskboard-rollinggroup-list');
    return response.data?.data?.items ?? [];
  },

  createRollingGroup: async (payload: { groupName: string; layoutIds: string; intervalSec: number; transitionType?: string; tenantId?: string }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-rollinggroup-insert', payload);
    return response.data?.data ?? 0;
  },

  updateRollingGroup: async (payload: { groupId: number; groupName: string; layoutIds: string; intervalSec: number; transitionType?: string }) => {
    const response = await apiClient.post('/taskboard-rollinggroup-update', payload);
    return response;
  },

  deleteRollingGroup: async (groupId: number) => {
    const response = await apiClient.delete('/taskboard-rollinggroup-delete', { params: { groupId } });
    return response;
  },

  // ── 공지사항 API ─────────────────────────────────────────────────────────

  getNoticeList: async (): Promise<TaskboardNotice[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardNotice[] }>>('/taskboard-noticelist');
    return response.data?.data?.items ?? [];
  },

  getNoticeListByKey: async (noticeKey: string): Promise<TaskboardNotice[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardNotice[] }>>(`/taskboard-noticelist/${noticeKey}`);
    return response.data?.data?.items ?? [];
  },

  createNotice: async (payload: Partial<TaskboardNotice>): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-noticeinsert', payload);
    return response.data?.data ?? 0;
  },

  updateNotice: async ({ noticeId, ...payload }: Partial<TaskboardNotice> & { noticeId: number }) => {
    const response = await apiClient.post(`/taskboard-noticeupdate/${noticeId}`, payload);
    return response;
  },

  deleteNotice: async (noticeId: number) => {
    const response = await apiClient.delete(`/taskboard-noticedelete/${noticeId}`);
    return response;
  },
};
