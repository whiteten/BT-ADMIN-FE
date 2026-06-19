import ApiClient, { type ApiResponse } from '@/shared-util';
import {
  type RollingGroup,
  type TaskboardBg,
  type TaskboardDisplay,
  type TaskboardDisplayLayout,
  type TaskboardDisplayLayoutDetail,
  type TaskboardLayout,
  type TaskboardNotice,
} from '../types/taskboard.types';

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

  // ── 디스플레이 API (레이아웃과 무관한 순수 선택값 그룹핑) ───────────────────────

  getDisplayList: async (): Promise<TaskboardDisplay[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardDisplay[] }>>('/taskboard-display-list');
    return response.data?.data?.items ?? [];
  },

  createDisplay: async (payload: { tenantId?: string; displayName: string; selectionJson: string }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-display-insert', payload);
    return response.data?.data ?? 0;
  },

  updateDisplay: async (payload: { displayId: number; displayName?: string; selectionJson?: string }) => {
    const response = await apiClient.post('/taskboard-display-update', payload);
    return response;
  },

  deleteDisplay: async (displayId: number) => {
    const response = await apiClient.delete('/taskboard-display-delete', { params: { displayId } });
    return response;
  },

  // ── 화면 인스턴스 API (디스플레이 그룹핑 × 레이아웃 N:M 연결) ──────────────────────

  getDisplayLayoutList: async (params?: { displayId?: number; layoutId?: number }): Promise<TaskboardDisplayLayout[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardDisplayLayout[] }>>('/taskboard-display-layout-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDisplayLayoutDetail: async (displayLayoutId: number): Promise<TaskboardDisplayLayoutDetail | undefined> => {
    const response = await apiClient.get<ApiResponse<TaskboardDisplayLayoutDetail>>('/taskboard-display-layout-detail', { params: { displayLayoutId } });
    return response.data?.data;
  },

  createDisplayLayout: async (payload: { displayId: number; layoutId: number }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-display-layout-insert', payload);
    return response.data?.data ?? 0;
  },

  deleteDisplayLayout: async (displayLayoutId: number) => {
    const response = await apiClient.delete('/taskboard-display-layout-delete', { params: { displayLayoutId } });
    return response;
  },

  // ── 롤링 그룹 API ────────────────────────────────────────────────────────

  getRollingGroupList: async (): Promise<RollingGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ items: RollingGroup[] }>>('/taskboard-rollinggroup-list');
    return response.data?.data?.items ?? [];
  },

  createRollingGroup: async (payload: { groupName: string; displayIds: string; intervalSec: number; transitionType?: string; tenantId?: string }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-rollinggroup-insert', payload);
    return response.data?.data ?? 0;
  },

  updateRollingGroup: async (payload: { groupId: number; groupName: string; displayIds: string; intervalSec: number; transitionType?: string }) => {
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
