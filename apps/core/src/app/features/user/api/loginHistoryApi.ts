import ApiClient, { type DetailResponse, type ListResponse, extractList } from '@/shared-util';
import type { LoginHistory, LoginHistorySearchParams } from '../types/loginHistory.types';

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
 * 로그인 이력 API 클라이언트
 * BFF Aggregation Flow를 통해 호출됨
 *
 * 등록된 flow:
 * - login-history-by-user: GET /api/manager/login-history/user/{userId}
 * - login-history-search: GET /api/manager/login-history/search
 * - login-history-recent-success: GET /api/manager/login-history/user/{userId}/recent-success
 * - login-history-recent-failed: GET /api/manager/login-history/user/{userId}/recent-failed
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const loginHistoryApi = {
  /**
   * 사용자별 로그인 이력 조회 (페이징)
   * @flow login-history-by-user
   */
  getByUserId: async (userId: number, params?: { page?: number; size?: number }): Promise<PagedResponse<LoginHistory>> => {
    const response = await apiClient.get<ListResponse<PagedResponse<LoginHistory>>>('/login-history-by-user', {
      params: { userId, ...params },
    });
    return extractList(response) as unknown as PagedResponse<LoginHistory>;
  },

  /**
   * 로그인 이력 검색
   * @flow login-history-search
   */
  search: async (params?: LoginHistorySearchParams): Promise<PagedResponse<LoginHistory>> => {
    const response = await apiClient.get<ListResponse<PagedResponse<LoginHistory>>>('/login-history-search', { params });
    return extractList(response) as unknown as PagedResponse<LoginHistory>;
  },

  /**
   * 최근 로그인 성공 이력 조회
   * @flow login-history-recent-success
   */
  getRecentSuccess: async (userId: number, limit = 5): Promise<LoginHistory[]> => {
    const response = await apiClient.get<DetailResponse<LoginHistory[]>>('/login-history-recent-success', {
      params: { userId, limit },
    });
    return response.data.data ?? [];
  },

  /**
   * 최근 로그인 실패 이력 조회
   * @flow login-history-recent-failed
   */
  getRecentFailed: async (userId: number, limit = 5): Promise<LoginHistory[]> => {
    const response = await apiClient.get<DetailResponse<LoginHistory[]>>('/login-history-recent-failed', {
      params: { userId, limit },
    });
    return response.data.data ?? [];
  },
};
