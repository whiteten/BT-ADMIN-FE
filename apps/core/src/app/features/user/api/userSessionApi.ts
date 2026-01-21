import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { UserSession, UserSessionSearchParams } from '../types/userSession.types';

/**
 * 페이징 응답 타입 (백엔드 PagedResponse와 일치)
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * 사용자 세션 API 클라이언트
 * BFF Aggregation Flow를 통해 호출됨
 *
 * 등록된 flow:
 * - user-session-active: GET /api/manager/sessions/user/{userId}/active
 * - user-session-count: GET /api/manager/sessions/user/{userId}/count
 * - user-session-history: GET /api/manager/sessions/user/{userId}
 * - user-session-detail: GET /api/manager/sessions/{sessionId}
 * - user-session-terminate: DELETE /api/manager/sessions/{sessionId}
 * - user-session-terminate-all: DELETE /api/manager/sessions/user/{userId}/all
 * - user-session-search: GET /api/manager/sessions/search
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userSessionApi = {
  /**
   * 사용자의 활성 세션 목록 조회
   * @flow user-session-active
   */
  getActiveSessions: async (userId: number): Promise<UserSession[]> => {
    const response = await apiClient.get<DetailResponse<UserSession[]>>('/user-session-active', {
      params: { userId },
    });
    return response.data.data ?? [];
  },

  /**
   * 사용자의 활성 세션 수 조회
   * @flow user-session-count
   */
  countActiveSessions: async (userId: number): Promise<number> => {
    const response = await apiClient.get<DetailResponse<number>>('/user-session-count', {
      params: { userId },
    });
    return extractDetail(response);
  },

  /**
   * 사용자의 전체 세션 이력 조회 (페이징)
   * @flow user-session-history
   */
  getSessionHistory: async (userId: number, params?: { page?: number; size?: number }): Promise<PagedResponse<UserSession>> => {
    const response = await apiClient.get<ListResponse<PagedResponse<UserSession>>>('/user-session-history', {
      params: { userId, ...params },
    });
    return extractList(response) as unknown as PagedResponse<UserSession>;
  },

  /**
   * 세션 단건 조회
   * @flow user-session-detail
   */
  getSession: async (sessionId: string): Promise<UserSession> => {
    const response = await apiClient.get<DetailResponse<UserSession>>('/user-session-detail', {
      params: { sessionId },
    });
    return extractDetail(response);
  },

  /**
   * 세션 강제 종료
   * @flow user-session-terminate
   */
  terminateSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete('/user-session-terminate', { params: { sessionId } });
  },

  /**
   * 사용자의 모든 세션 강제 종료
   * @flow user-session-terminate-all
   */
  terminateAllSessions: async (userId: number): Promise<number> => {
    const response = await apiClient.delete<DetailResponse<number>>('/user-session-terminate-all', {
      params: { userId },
    });
    return extractDetail(response);
  },

  /**
   * 세션 검색
   * @flow user-session-search
   */
  search: async (params?: UserSessionSearchParams): Promise<PagedResponse<UserSession>> => {
    const response = await apiClient.get<ListResponse<PagedResponse<UserSession>>>('/user-session-search', { params });
    return extractList(response) as unknown as PagedResponse<UserSession>;
  },
};
