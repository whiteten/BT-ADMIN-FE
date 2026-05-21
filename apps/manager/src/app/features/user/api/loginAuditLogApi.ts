import ApiClient from '@/shared-util';
import type { LoginAuditLog, LoginAuditLogSearchParams } from '../types';

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
 * API 응답 구조 (BFF ApiResponse)
 */
interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message: string;
  data: T;
}

/**
 * 로그인 감사 로그 API 클라이언트
 * BFF Aggregation Flow를 통해 호출됨
 *
 * 등록된 flow:
 * - login-log-list: GET /api/manager/login-logs
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const loginAuditLogApi = {
  /**
   * 로그인 이력 검색
   * 모든 파라미터는 선택적이며, 기간 미지정 시 최근 7일 데이터 조회
   * @flow login-log-list
   */
  search: async (params?: LoginAuditLogSearchParams): Promise<PagedResponse<LoginAuditLog>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<LoginAuditLog>>>('/login-log-list', { params });
    // ApiResponse.data에서 PagedResponse 추출
    return response?.data?.data ?? { items: [], page: 0, size: 0, total: 0 };
  },
};
