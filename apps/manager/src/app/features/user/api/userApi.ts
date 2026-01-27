import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { PasswordChangeDatas, User, UserCreateDatas, UserUpdateDatas } from '../types/user.types';

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
 * BFF Aggregation Flow를 통한 API 클라이언트
 * 모든 API는 반드시 BFF를 통해서만 호출 (bingbang2.md 규칙 참고)
 *
 * 등록된 flow:
 * - user-list: GET /api/manager/users
 * - user-detail: GET /api/manager/users/{userId}
 * - user-create: POST /api/manager/users
 * - user-update: PUT /api/manager/users/{userId}
 * - user-delete: DELETE /api/manager/users/{userId}
 * - user-search: GET /api/manager/users/search
 * - user-by-sabun: GET /api/manager/users/by-sabun/{userSabun}
 * - user-password: PUT /api/manager/users/{userId}/password
 * - user-unlock: POST /api/manager/users/{userId}/unlock
 * - user-lock: POST /api/manager/users/{userId}/lock
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userApi = {
  /**
   * 사용자 목록 조회 (전체 조회, 페이징 없음)
   * @flow user-list
   */
  getUsers: async (params?: Record<string, unknown>): Promise<User[]> => {
    const response = await apiClient.get<ListResponse<User>>('/user-list', { params });
    return extractList(response);
  },

  /**
   * 사용자 검색
   * @flow user-search
   */
  searchUsers: async (params?: Record<string, unknown>): Promise<PagedResponse<User>> => {
    const response = await apiClient.get<ListResponse<PagedResponse<User>>>('/user-search', { params });
    return extractList(response) as unknown as PagedResponse<User>;
  },

  /**
   * 사용자 단건 조회
   * @flow user-detail
   */
  getUser: async (params?: Record<string, unknown>): Promise<User> => {
    const response = await apiClient.get<DetailResponse<User>>('/user-detail', { params });
    return extractDetail(response);
  },

  /**
   * 사번으로 사용자 조회
   * @flow user-by-sabun
   */
  getUserBySabun: async (params?: Record<string, unknown>): Promise<User> => {
    const response = await apiClient.get<DetailResponse<User>>('/user-by-sabun', { params });
    return extractDetail(response);
  },

  /**
   * 사용자 생성
   * @flow user-create
   */
  createUser: async (data: UserCreateDatas): Promise<User> => {
    const response = await apiClient.post<DetailResponse<User>>('/user-create', data);
    return extractDetail(response);
  },

  /**
   * 사용자 수정
   * @flow user-update
   */
  updateUser: async ({ params, data }: { params: Record<string, unknown>; data: UserUpdateDatas }) => {
    const response = await apiClient.put('/user-update', data, { params });
    return response;
  },

  /**
   * 사용자 삭제
   * @flow user-delete
   */
  deleteUser: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/user-delete', { params });
    return response;
  },

  /**
   * 비밀번호 변경
   * @flow user-password
   */
  changePassword: async ({ params, data }: { params: Record<string, unknown>; data: PasswordChangeDatas }) => {
    const response = await apiClient.put('/user-password', data, { params });
    return response;
  },

  /**
   * 로그인 잠금 해제
   * @flow user-unlock
   */
  unlockUser: async ({ params, data }: { params: Record<string, unknown>; data?: Record<string, unknown> }) => {
    const response = await apiClient.post('/user-unlock', data ?? {}, { params });
    return response;
  },

  /**
   * 로그인 잠금
   * @flow user-lock
   */
  lockUser: async ({ params, data }: { params: Record<string, unknown>; data?: Record<string, unknown> }) => {
    const response = await apiClient.post('/user-lock', data ?? {}, { params });
    return response;
  },
};
