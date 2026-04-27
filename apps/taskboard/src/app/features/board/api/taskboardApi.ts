import ApiTaskboard, { type DetailResponse, extractDetail } from '@/shared-util';
import { type TaskboardBg, type TaskboardLayout } from '../types/taskboard.types';

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
    const response = await apiTaskboard.post<any>('/taskboard-layoutinsert', payload);
    return response?.data?.data ?? 0;
  },

  updateLayout: async ({ layoutId, layoutName, layoutJson }: { layoutId: number; layoutName: string; layoutJson: string }): Promise<any> => {
    const response = await apiTaskboard.put('/taskboard-layoutupdate', { layoutName, layoutJson }, { params: { layoutId } });
    return response.data;
  },

  deleteLayout: async (layoutId: number): Promise<any> => {
    const response = await apiTaskboard.delete('/taskboard-layoutdelete', { params: { layoutId } });
    return response.data;
  },
};
