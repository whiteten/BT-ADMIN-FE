import ApiTaskboard, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import { type TaskboardBg } from '../types/taskboard.types';

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
   * @flow client-list
   */
  getTaskBoardBgs: async (params?: Record<string, unknown>): Promise<TaskboardBg[]> => {
    // 백엔드에서 TaskboardBg 리스트를 내려준다고 가정
    const response = await apiTaskboard.get<ListResponse<TaskboardBg>>('/taskboard-bglist', { params });
    return extractList(response);
  },

  /**
   * [BG INSERT] 전광판 배경 생성 (이미지 파일 + JSON 데이터)
   */
  createTaskBoardBg: async (formData: FormData): Promise<any> => {
    // 파일이 포함된 FormData는 헤더에 multipart/form-data를 선언해줍니다.
    const response = await apiTaskboard.post('/taskboard-insert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },
};
