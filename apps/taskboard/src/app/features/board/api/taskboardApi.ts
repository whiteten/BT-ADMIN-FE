import ApiTaskboard, { type DetailResponse, extractDetail } from '@/shared-util';
import { type RollingGroup, type TaskboardBg, type TaskboardLayout } from '../types/taskboard.types';

/**
 * BFF Aggregation Flow를 통한 OAuth2 클라이언트 API 클라이언트
 * 모든 API는 반드시 BFF를 통해서만 호출
 *
 * 등록된 flow:
 * - client-list: GET /api/bff/flows/client-list
 * - client-detail: GET /api/bff/flows/client-detail
 * - client-create: POST /api/bff/flows/client-create
 * - client-update: PUT /api/bff/flows/client-update
 * - client-delete: DELETE /api/bff/flows/client-delete
 * - client-toggle-active: PUT /api/bff/flows/client-toggle-active
 */
const apiTaskboard = new ApiTaskboard({ serviceURL: '/bff' });

export const taskboardApi = {
  /**
   * 전광판배경 목록 조회
   * @flow taskbaord-list
   */
  getTaskBoardBgs: async (params?: Record<string, unknown>): Promise<TaskboardBg[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-bglist', { params });
    const resultList = response?.data?.data?.value ?? response?.data?.data;
    if (Array.isArray(resultList)) return resultList;

    return []; // 데이터가 없거나 형식이 다를 경우 빈 배열 리턴
  },

  /**
   * 전광판배경 삭제
   * @flow taskboard-bgdelete
   */
  deleteTaskBoardBg: async (pageId: number): Promise<any> => {
    const response = await apiTaskboard.delete('/taskboard-bgdelete', { params: { bgId: pageId } });
    return response.data;
  },

  /**
   * [BG INSERT] 전광판 배경 생성 (이미지 파일 + JSON 데이터)
   */
  createTaskBoardBg: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<any> => {
    const formData = new FormData();
    formData.append('uploadFile', data); // BE @RequestParam("uploadFile") 과 일치
    if (params?.data) {
      formData.append('data', String(params.data));
    }
    const response = await apiTaskboard.post<DetailResponse<any>>('/taskboard-bginsert', formData);
    return extractDetail(response);
  },

  // ── 레이아웃 API ──────────────────────────────────────────────────────────

  getLayoutList: async (): Promise<TaskboardLayout[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-layoutlist');
    const resultList = response?.data?.data?.value ?? response?.data?.data;
    if (Array.isArray(resultList)) return resultList;
    return [];
  },

  createLayout: async (payload: { pageId: number; tenantId: string; layoutName: string; layoutJson: string; authorName?: string; authRole?: string }): Promise<number> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    const response = await apiTaskboard.post<any>('/taskboard-layoutinsert', formData);
    return response?.data?.data ?? 0;
  },

  updateLayout: async ({ layoutId, layoutName, layoutJson }: { layoutId: number; layoutName: string; layoutJson: string }): Promise<any> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ layoutId, layoutName, layoutJson }));
    const response = await apiTaskboard.post('/taskboard-layoutupdate', formData, { params: { layoutId } });
    return response.data;
  },

  deleteLayout: async (layoutId: number): Promise<any> => {
    const response = await apiTaskboard.delete('/taskboard-layoutdelete', { params: { layoutId } });
    return response.data;
  },

  // ── 롤링 그룹 API ────────────────────────────────────────────────────────

  getRollingGroupList: async (): Promise<RollingGroup[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-rollinggroup-list');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  createRollingGroup: async (payload: { groupName: string; layoutIds: string; intervalSec: number; rollingData: string; tenantId?: string }): Promise<number> => {
    const response = await apiTaskboard.post<any>('/taskboard-rollinggroup-insert', payload);
    return response?.data?.data ?? 0;
  },

  updateRollingGroup: async (payload: { groupId: number; groupName: string; layoutIds: string; intervalSec: number; rollingData: string }): Promise<any> => {
    const response = await apiTaskboard.post('/taskboard-rollinggroup-update', payload);
    return response.data;
  },

  deleteRollingGroup: async (groupId: number): Promise<any> => {
    const response = await apiTaskboard.delete(`/taskboard-rollinggroup-delete/${groupId}`);
    return response.data;
  },

  /** 공개 토큰으로 롤링 그룹 조회 — 인증 없이 직접 fetch */
  getPublicRollingGroup: async (token: string): Promise<RollingGroup> => {
    const response = await fetch(`/api/taskboard/public/rolling-group/${token}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.data as RollingGroup;
  },
};
